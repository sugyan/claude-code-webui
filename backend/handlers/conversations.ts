import { Context } from "hono";
import { validateEncodedProjectName } from "../history/pathUtils.ts";
import { loadConversation } from "../history/conversationLoader.ts";
import { logger } from "../utils/logger.ts";

/**
 * Handles GET /api/projects/:encodedProjectName/histories/:sessionId requests
 * Retrieves detailed conversation history for a specific session
 * @param c - Hono context object with config variables
 * @returns JSON response with conversation details
 */
export async function handleConversationRequest(c: Context) {
  try {
    const encodedProjectName = c.req.param("encodedProjectName");
    const sessionId = c.req.param("sessionId");

    if (!encodedProjectName) {
      return c.json({ error: "Encoded project name is required" }, 400);
    }

    if (!sessionId) {
      return c.json({ error: "Session ID is required" }, 400);
    }

    if (!validateEncodedProjectName(encodedProjectName)) {
      return c.json({ error: "Invalid encoded project name" }, 400);
    }

    logger.history.debug(
      `Fetching conversation details for project: ${encodedProjectName}, session: ${sessionId}`,
    );

    // Load the specific conversation (already returns processed ConversationHistory)
    const conversationHistory = await loadConversation(
      encodedProjectName,
      sessionId,
    );

    if (!conversationHistory) {
      return c.json(
        {
          error: "Conversation not found",
          sessionId,
        },
        404,
      );
    }

    logger.history.debug(
      `Loaded conversation with ${conversationHistory.messages.length} messages`,
    );

    return c.json(conversationHistory);
  } catch (error) {
    logger.history.error("Error fetching conversation details: {error}", {
      error,
    });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("Invalid session ID")) {
        return c.json(
          {
            error: "Invalid session ID format",
            details: error.message,
          },
          400,
        );
      }

      if (error.message.includes("Invalid encoded project name")) {
        return c.json(
          {
            error: "Invalid project name",
            details: error.message,
          },
          400,
        );
      }
    }

    return c.json(
      {
        error: "Failed to fetch conversation details",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}
