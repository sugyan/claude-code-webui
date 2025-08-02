import { Context } from "hono";
import type { ProjectInfo, ProjectsResponse } from "../../shared/types.ts";
import { getEncodedProjectName } from "../history/pathUtils.ts";
import { logger } from "../utils/logger.ts";
import { readTextFile } from "../utils/fs.ts";
import { getHomeDir } from "../utils/os.ts";

/**
 * Handles GET /api/projects requests
 * Retrieves list of available project directories from Claude configuration
 * @param c - Hono context object
 * @returns JSON response with projects array
 */
export async function handleProjectsRequest(c: Context) {
  try {
    const homeDir = getHomeDir();
    if (!homeDir) {
      return c.json({ error: "Home directory not found" }, 500);
    }

    const claudeConfigPath = `${homeDir}/.claude.json`;

    try {
      const configContent = await readTextFile(claudeConfigPath);
      const config = JSON.parse(configContent);

      if (config.projects && typeof config.projects === "object") {
        const projectPaths = Object.keys(config.projects);

        // Get encoded names for each project, only include projects with history
        const projects: ProjectInfo[] = [];
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

        const response: ProjectsResponse = { projects };
        return c.json(response);
      } else {
        const response: ProjectsResponse = { projects: [] };
        return c.json(response);
      }
    } catch (error) {
      // Handle file not found errors in a cross-platform way
      if (error instanceof Error && error.message.includes("No such file")) {
        const response: ProjectsResponse = { projects: [] };
        return c.json(response);
      }
      throw error;
    }
  } catch (error) {
    logger.api.error("Error reading projects: {error}", { error });
    return c.json({ error: "Failed to read projects" }, 500);
  }
}
