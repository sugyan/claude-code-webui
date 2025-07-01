import { Context } from "hono";
import type { ProjectInfo, ProjectsResponse } from "../../shared/types.ts";
import { getEncodedProjectName } from "../history/pathUtils.ts";

/**
 * Handles GET /api/projects requests
 * Retrieves list of available project directories from Claude configuration
 * @param c - Hono context object
 * @returns JSON response with projects array
 */
export async function handleProjectsRequest(c: Context) {
  try {
    const homeDir = Deno.env.get("HOME");
    if (!homeDir) {
      return c.json({ error: "HOME environment variable not found" }, 500);
    }

    const claudeConfigPath = `${homeDir}/.claude.json`;

    try {
      const configContent = await Deno.readTextFile(claudeConfigPath);
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
      if (error instanceof Deno.errors.NotFound) {
        const response: ProjectsResponse = { projects: [] };
        return c.json(response);
      }
      throw error;
    }
  } catch (error) {
    console.error("Error reading projects:", error);
    return c.json({ error: "Failed to read projects" }, 500);
  }
}
