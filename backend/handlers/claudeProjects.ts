import { Context } from "hono";
import { readDir, stat } from "../utils/fs.ts";
import { getHomeDir } from "../utils/os.ts";
import { logger } from "../utils/logger.ts";
import { parseAllHistoryFiles } from "../history/parser.ts";
import { groupConversations } from "../history/grouping.ts";

export interface ClaudeProject {
  encodedName: string;
  displayName: string;
  path: string; // The actual file system path
  conversationCount: number;
  lastModified?: string;
}

export interface ClaudeProjectsResponse {
  projects: ClaudeProject[];
}

/**
 * Decode the encoded project name back to a readable path
 * Example: "C--Users-Windows10-new-Documents-web-game2" → "C:/Users/Windows10_new/Documents/web-game2"
 */
function decodeProjectName(encodedName: string): string {
  let decoded = encodedName;
  
  // Handle drive letter (C--)
  decoded = decoded.replace(/^([A-Z])--/, "$1:/");
  
  // Replace remaining hyphens with forward slashes for path separators
  decoded = decoded.replace(/-/g, "/");
  
  // Handle common patterns where underscores were converted to hyphens
  // This is heuristic-based and may need adjustment for specific cases
  decoded = decoded.replace(/Windows10\/new/g, "Windows10_new");
  decoded = decoded.replace(/web\/game(\d+)/g, "web-game$1"); // web-game2, web-game3, etc.
  decoded = decoded.replace(/claude\/code\/webui/g, "claude-code-webui"); // claude-code-webui
  
  return decoded;
}

/**
 * Get a display-friendly name for the project
 */
function getDisplayName(encodedName: string): string {
  // For Windows paths like "C--Users-Windows10-new-Documents-web-game2"
  // We need to extract the project name, which could contain hyphens
  
  // First, handle the drive letter and path structure
  let pathPart = encodedName;
  
  // Remove drive letter pattern (C--)
  pathPart = pathPart.replace(/^[A-Z]--/, "");
  
  // Split into path segments
  const segments = pathPart.split("-").filter(p => p.length > 0);
  
  // For a typical path like "Users-Windows10-new-Documents-web-game2"
  // We want to find the project name after "Documents" or similar directory indicators
  const commonDirs = ["Users", "Documents", "Desktop", "Projects", "Development"];
  
  // Find the last common directory and take everything after it
  let projectStartIndex = -1;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (commonDirs.some(dir => segments[i].toLowerCase().includes(dir.toLowerCase()))) {
      projectStartIndex = i + 1;
      break;
    }
  }
  
  // If we found a common directory, take everything after it as the project name
  if (projectStartIndex > 0 && projectStartIndex < segments.length) {
    const projectParts = segments.slice(projectStartIndex);
    // Rejoin with hyphens for project names that originally had hyphens
    return projectParts.join("-");
  }
  
  // Fallback: take the last 2 parts if they look like a project name
  if (segments.length >= 2) {
    const lastTwo = segments.slice(-2);
    // If they look like they could be a compound name (like "web-game2")
    if (lastTwo.every(part => part.length <= 10)) {
      return lastTwo.join("-");
    }
  }
  
  // Final fallback: just take the last part
  return segments[segments.length - 1] || encodedName;
}

/**
 * Handles GET /api/claude/projects requests
 * Lists all projects from the .claude/projects directory
 */
export async function handleClaudeProjectsRequest(c: Context) {
  try {
    const homeDir = getHomeDir();
    if (!homeDir) {
      return c.json({ error: "Home directory not found" }, 500);
    }

    const projectsDir = `${homeDir}/.claude/projects`;
    
    // Check if the projects directory exists
    try {
      const dirInfo = await stat(projectsDir);
      if (!dirInfo.isDirectory) {
        return c.json({ projects: [] });
      }
    } catch {
      // Directory doesn't exist
      return c.json({ projects: [] });
    }

    const projects: ClaudeProject[] = [];
    
    // Read all directories in .claude/projects
    for await (const entry of readDir(projectsDir)) {
      if (entry.isDirectory) {
        const projectPath = `${projectsDir}/${entry.name}`;
        
        // Count conversation files and get last modified time
        let conversationCount = 0;
        let lastModified: Date | undefined;
        
        try {
          for await (const file of readDir(projectPath)) {
            if (file.name.endsWith(".jsonl")) {
              conversationCount++;
              
              // Get file stats to find last modified time
              const filePath = `${projectPath}/${file.name}`;
              const fileInfo = await stat(filePath);
              if (!lastModified || fileInfo.mtime > lastModified) {
                lastModified = fileInfo.mtime;
              }
            }
          }
        } catch (error) {
          logger.api.error(`Error reading project directory ${entry.name}: {error}`, { error });
        }
        
        projects.push({
          encodedName: entry.name,
          displayName: getDisplayName(entry.name),
          path: decodeProjectName(entry.name),
          conversationCount,
          lastModified: lastModified?.toISOString(),
        });
      }
    }
    
    // Sort projects by last modified time (most recent first)
    projects.sort((a, b) => {
      if (!a.lastModified) return 1;
      if (!b.lastModified) return -1;
      return b.lastModified.localeCompare(a.lastModified);
    });
    
    const response: ClaudeProjectsResponse = { projects };
    return c.json(response);
    
  } catch (error) {
    logger.api.error("Error reading Claude projects: {error}", { error });
    return c.json({ error: "Failed to read Claude projects" }, 500);
  }
}

/**
 * Handles GET /api/claude/projects/:encodedProjectName/conversations
 * Lists all conversations for a specific project with metadata
 */
export async function handleProjectConversationsRequest(c: Context) {
  try {
    const encodedProjectName = c.req.param("encodedProjectName");
    
    if (!encodedProjectName) {
      return c.json({ error: "Project name is required" }, 400);
    }
    
    const homeDir = getHomeDir();
    if (!homeDir) {
      return c.json({ error: "Home directory not found" }, 500);
    }
    
    const projectDir = `${homeDir}/.claude/projects/${encodedProjectName}`;
    
    // Check if the project directory exists
    try {
      const dirInfo = await stat(projectDir);
      if (!dirInfo.isDirectory) {
        return c.json({ error: "Project not found" }, 404);
      }
    } catch {
      return c.json({ error: "Project not found" }, 404);
    }
    
    // Parse all history files in the project directory
    const historyFiles = await parseAllHistoryFiles(projectDir);
    
    // Group conversations
    const conversations = groupConversations(historyFiles);
    
    // Sort by last message time (most recent first)
    conversations.sort((a, b) => {
      if (!a.lastTime) return 1;
      if (!b.lastTime) return -1;
      return b.lastTime.localeCompare(a.lastTime);
    });
    
    return c.json({ conversations });
    
  } catch (error) {
    logger.api.error("Error reading project conversations: {error}", { error });
    return c.json({ error: "Failed to read project conversations" }, 500);
  }
}