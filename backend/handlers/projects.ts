import { Context } from "hono";
import type { ProjectInfo, ProjectsResponse } from "../../shared/types.ts";
import type { ConfigContext } from "../middleware/config.ts";
import { getEncodedProjectName } from "../history/pathUtils.ts";
import { logger } from "../utils/logger.ts";
import { readTextFile } from "../utils/fs.ts";
import { getHomeDir } from "../utils/os.ts";
import { requireAuth } from "./auth.ts";
import { spawn } from "child_process";
import { readdir, stat, access } from "fs/promises";
import { join, basename } from "path";

/**
 * Check if a directory contains any .md files (making it a potential project)
 */
async function directoryContainsMdFiles(dirPath: string): Promise<boolean> {
  try {
    const items = await readdir(dirPath);
    return items.some(item => item.toLowerCase().endsWith('.md'));
  } catch (error) {
    return false;
  }
}

/**
 * Scan directory for potential projects (directories with .md files)
 * Scans up to 2 levels deep from the user's home directory
 */
async function scanForProjects(homeDir: string, username: string): Promise<ProjectInfo[]> {
  const projects: ProjectInfo[] = [];
  
  try {
    logger.project.info("Scanning for projects in {homeDir} for user {username}", { homeDir, username });
    
    // Check if home directory exists and is accessible
    try {
      await access(homeDir);
    } catch (error) {
      logger.project.warn("Home directory {homeDir} not accessible for user {username}", { homeDir, username });
      return projects;
    }

    // Scan level 1: Direct subdirectories of home
    const level1Items = await readdir(homeDir);
    
    for (const item of level1Items) {
      const level1Path = join(homeDir, item);
      
      try {
        const level1Stat = await stat(level1Path);
        
        if (level1Stat.isDirectory()) {
          // Skip hidden directories and common system directories
          if (item.startsWith('.') || ['node_modules', 'bin', 'lib', 'tmp', '.cache'].includes(item)) {
            continue;
          }

          // Check if this directory contains .md files
          const hasMdFiles = await directoryContainsMdFiles(level1Path);
          if (hasMdFiles) {
            const encodedName = await getEncodedProjectName(level1Path);
            projects.push({
              path: level1Path,
              encodedName: encodedName || item,
            });
            logger.project.debug("Found project at level 1: {path}", { path: level1Path });
          }

          // Scan level 2: Subdirectories of level 1
          try {
            const level2Items = await readdir(level1Path);
            
            for (const level2Item of level2Items) {
              const level2Path = join(level1Path, level2Item);
              
              try {
                const level2Stat = await stat(level2Path);
                
                if (level2Stat.isDirectory()) {
                  // Skip hidden directories and common system directories
                  if (level2Item.startsWith('.') || ['node_modules', 'bin', 'lib', 'tmp', '.cache'].includes(level2Item)) {
                    continue;
                  }

                  // Check if this directory contains .md files
                  const level2HasMdFiles = await directoryContainsMdFiles(level2Path);
                  if (level2HasMdFiles) {
                    const encodedName = await getEncodedProjectName(level2Path);
                    projects.push({
                      path: level2Path,
                      encodedName: encodedName || `${item}/${level2Item}`,
                    });
                    logger.project.debug("Found project at level 2: {path}", { path: level2Path });
                  }
                }
              } catch (error) {
                // Skip directories we can't access
                continue;
              }
            }
          } catch (error) {
            // Skip if we can't read the level 1 directory
            continue;
          }
        }
      } catch (error) {
        // Skip items we can't stat
        continue;
      }
    }

    logger.project.info("Found {count} projects for user {username}", { 
      count: projects.length, 
      username 
    });

  } catch (error) {
    logger.project.error("Error scanning for projects: {error}", { error });
  }

  return projects;
}

/**
 * Try to load projects from .claude.json configuration file
 */
async function loadProjectsFromConfig(homeDir: string): Promise<ProjectInfo[]> {
  const projects: ProjectInfo[] = [];
  const claudeConfigPath = `${homeDir}/.claude.json`;

  try {
    const configContent = await readTextFile(claudeConfigPath);
    const config = JSON.parse(configContent);

    if (config.projects && typeof config.projects === "object") {
      const projectPaths = Object.keys(config.projects);

      for (const path of projectPaths) {
        const encodedName = await getEncodedProjectName(path);
        // Only include projects that have history directories
        if (encodedName) {
          projects.push({
            path,
            encodedName,
          });
        }
      }
    }
  } catch (error) {
    // File doesn't exist or can't be read - this is normal for new users
    logger.project.debug("No .claude.json found or error reading it: {error}", { error: error instanceof Error ? error.message : error });
  }

  return projects;
}

/**
 * Handles GET /api/projects requests
 * Enhanced project discovery: scans user directories and detects projects by .md files
 * @param c - Hono context object
 * @returns JSON response with projects array
 */
export async function handleProjectsRequest(c: Context<ConfigContext>) {
  try {
    // Check authentication
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const user = c.get('user');
    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    logger.api.info("Enhanced project scanning for user: {username} in {homeDir}", { 
      username: user.username, 
      homeDir: user.homeDirectory 
    });

    const homeDir = user.homeDirectory;
    let allProjects: ProjectInfo[] = [];

    // Strategy 1: Try to load projects from existing .claude.json file
    const configProjects = await loadProjectsFromConfig(homeDir);
    if (configProjects.length > 0) {
      logger.api.info("Found {count} projects from .claude.json", { count: configProjects.length });
      allProjects = [...allProjects, ...configProjects];
    }

    // Strategy 2: Enhanced scanning - look for directories with .md files (2 levels deep)
    const scannedProjects = await scanForProjects(homeDir, user.username);
    if (scannedProjects.length > 0) {
      logger.api.info("Found {count} projects by scanning directories", { count: scannedProjects.length });
      
      // Merge and deduplicate projects (config projects take priority)
      const existingPaths = new Set(allProjects.map(p => p.path));
      for (const scannedProject of scannedProjects) {
        if (!existingPaths.has(scannedProject.path)) {
          allProjects.push(scannedProject);
        }
      }
    }

    // Sort projects by path for consistent ordering
    allProjects.sort((a, b) => a.path.localeCompare(b.path));

    logger.api.info("Total projects found for user {username}: {count}", { 
      username: user.username, 
      count: allProjects.length 
    });

    const response: ProjectsResponse = { projects: allProjects };
    return c.json(response);

  } catch (error) {
    logger.api.error("Error in enhanced project scanning: {error}", { error });
    return c.json({ error: "Failed to scan for projects" }, 500);
  }
}
