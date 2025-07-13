/**
 * Status API handler
 * Handles requests to check the status of a streaming request
 */

import { Context } from "hono";
import type { StatusResponse } from "../../shared/types.ts";
import { RequestStatus } from "../../shared/types.ts";
import { getRequestStatus } from "../streaming/streamingFileManager.ts";

/**
 * Handles GET /api/status/:requestId requests
 * Returns the current status of a streaming request
 */
export function handleStatusRequest(c: Context): Response {
  const requestId = c.req.param("requestId");

  // Validate requestId
  if (!requestId) {
    return c.json({ error: "Request ID is required" }, 400);
  }

  // Get request status
  const status = getRequestStatus(requestId);

  if (!status) {
    const response: StatusResponse = {
      requestId,
      status: RequestStatus.NOT_FOUND,
      totalMessages: 0,
      lastUpdated: new Date().toISOString(),
    };
    return c.json(response);
  }

  const response: StatusResponse = {
    requestId,
    status: status.status,
    totalMessages: status.totalMessages,
    lastUpdated: status.lastUpdated.toISOString(),
  };

  return c.json(response);
}
