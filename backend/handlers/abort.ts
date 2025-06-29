import { Context } from "hono";

/**
 * Handles POST /api/abort/:requestId requests
 * Aborts an ongoing chat request by request ID
 * @param c - Hono context object with config variables
 * @param requestAbortControllers - Map of request IDs to AbortControllers
 * @returns JSON response indicating success or failure
 */
export function handleAbortRequest(
  c: Context,
  requestAbortControllers: Map<string, AbortController>,
) {
  const { debugMode } = c.var.config;
  const requestId = c.req.param("requestId");

  if (!requestId) {
    return c.json({ error: "Request ID is required" }, 400);
  }

  if (debugMode) {
    console.debug(`[DEBUG] Abort attempt for request: ${requestId}`);
    console.debug(
      `[DEBUG] Active requests: ${Array.from(requestAbortControllers.keys())}`,
    );
  }

  const abortController = requestAbortControllers.get(requestId);
  if (abortController) {
    abortController.abort();
    requestAbortControllers.delete(requestId);

    if (debugMode) {
      console.debug(`[DEBUG] Aborted request: ${requestId}`);
    }

    return c.json({ success: true, message: "Request aborted" });
  } else {
    return c.json({ error: "Request not found or already completed" }, 404);
  }
}
