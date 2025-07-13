/**
 * Resume API handler
 * Handles requests to resume streaming from a specific point after network interruption
 */

import { Context } from "hono";
import type { ResumeResponse } from "../../shared/types.ts";
import {
  getRequestStatus,
  readStreamingFile,
} from "../streaming/streamingFileManager.ts";

/**
 * Handles GET /api/resume/:requestId requests
 * Returns messages from a specific index for resuming interrupted streams
 */
export async function handleResumeRequest(c: Context): Promise<Response> {
  const requestId = c.req.param("requestId");
  const fromIndex = parseInt(c.req.query("fromIndex") || "0", 10);
  const { runtime } = c.var.config;

  // Validate requestId
  if (!requestId) {
    return c.json({ error: "Request ID is required" }, 400);
  }

  // Get request status
  const status = getRequestStatus(requestId);
  if (!status) {
    return c.json({ error: "Request not found" }, 404);
  }

  // Extract encoded project name from the file path
  // Format: /home/user/.claude/projects/{encodedProjectName}/streaming/{requestId}.jsonl
  const pathParts = status.filePath.split("/");
  const projectsIndex = pathParts.indexOf("projects");
  if (projectsIndex === -1 || projectsIndex + 2 >= pathParts.length) {
    return c.json({ error: "Invalid file path structure" }, 500);
  }
  const encodedProjectName = pathParts[projectsIndex + 1];

  try {
    // Read messages from the streaming file
    const messages = await readStreamingFile(
      encodedProjectName,
      requestId,
      fromIndex,
      runtime,
    );

    const response: ResumeResponse = {
      messages,
      totalMessages: status.totalMessages,
      isComplete: status.status !== "in_progress",
    };

    return c.json(response);
  } catch (error) {
    console.error("Failed to read streaming file:", error);
    return c.json({ error: "Failed to read streaming data" }, 500);
  }
}
