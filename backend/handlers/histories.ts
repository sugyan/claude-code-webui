import { Context } from "hono";
import type { HistoryListResponse } from "../../shared/types.ts";
import { validateEncodedProjectName } from "../history/pathUtils.ts";
import { parseAllHistoryFiles } from "../history/parser.ts";
import { groupConversations } from "../history/grouping.ts";
import { logger } from "../utils/logger.ts";
import { stat } from "../utils/fs.ts";
import { getHomeDir } from "../utils/os.ts";

/**
 * Handles GET /api/projects/:encodedProjectName/histories requests
 * Fetches conversation history list for a specific project
 * @param c - Hono context object with config variables
 * @returns JSON response with conversation history list
 */
export async function handleHistoriesRequest(c: Context) {
  try {
    const encodedProjectName = c.req.param("encodedProjectName");

    if (!encodedProjectName) {
      return c.json({ error: "Encoded project name is required" }, 400);
    }

    if (!validateEncodedProjectName(encodedProjectName)) {
      return c.json({ error: "Invalid encoded project name" }, 400);
    }

    logger.history.debug(
      `Fetching histories for encoded project: ${encodedProjectName}`,
    );

    // Get home directory
    const homeDir = getHomeDir();
    if (!homeDir) {
      return c.json({ error: "Home directory not found" }, 500);
    }

    // Build history directory path directly from encoded name
    const historyDir = `${homeDir}/.claude/projects/${encodedProjectName}`;

    logger.history.debug(`History directory: ${historyDir}`);

    // Check if the directory exists
    try {
      const dirInfo = await stat(historyDir);
      if (!dirInfo.isDirectory) {
        return c.json({ error: "Project not found" }, 404);
      }
    } catch (error) {
      // Handle file not found errors in a cross-platform way
      if (error instanceof Error && error.message.includes("No such file")) {
        return c.json({ error: "Project not found" }, 404);
      }
      throw error;
    }

    const conversationFiles = await parseAllHistoryFiles(historyDir);

    logger.history.debug(
      `Found ${conversationFiles.length} conversation files`,
    );

    // Group conversations and remove duplicates
    const conversations = groupConversations(conversationFiles);

    logger.history.debug(
      `After grouping: ${conversations.length} unique conversations`,
    );

    const response: HistoryListResponse = {
      conversations,
    };

    return c.json(response);
  } catch (error) {
    logger.history.error("Error fetching conversation histories: {error}", {
      error,
    });

    return c.json(
      {
        error: "Failed to fetch conversation histories",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}
