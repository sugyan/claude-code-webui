import { Context } from "hono";
import { query, type PermissionMode } from "@anthropic-ai/claude-code";
import type { ChatRequest, StreamResponse } from "../../shared/types.ts";
import { logger } from "../utils/logger.ts";
import { getPlatform } from "../utils/os.ts";
import { dirname } from "node:path";

/**
 * Gets the runtime type for Claude SDK
 * @returns The runtime type that Claude SDK expects
 */
function getRuntimeType(): "bun" | "deno" | "node" {
  // Check for Deno runtime
  if (typeof (globalThis as any).Deno !== "undefined") {
    return "deno";
  }

  // Check for Bun runtime
  if (typeof (globalThis as any).Bun !== "undefined") {
    return "bun";
  }

  // Default to Node.js
  return "node";
}

/**
 * Executes a Claude command and yields streaming responses
 * @param message - User message or command
 * @param requestId - Unique request identifier for abort functionality
 * @param requestAbortControllers - Shared map of abort controllers
 * @param cliPath - Path to actual CLI script (detected by validateClaudeCli)
 * @param sessionId - Optional session ID for conversation continuity
 * @param allowedTools - Optional array of allowed tool names
 * @param workingDirectory - Optional working directory for Claude execution
 * @param permissionMode - Optional permission mode for Claude execution
 * @returns AsyncGenerator yielding StreamResponse objects
 */
async function* executeClaudeCommand(
  message: string,
  requestId: string,
  requestAbortControllers: Map<string, AbortController>,
  cliPath: string,
  sessionId?: string,
  allowedTools?: string[],
  workingDirectory?: string,
  permissionMode?: PermissionMode,
): AsyncGenerator<StreamResponse> {
  let abortController: AbortController;

  try {
    // Process commands that start with '/'
    let processedMessage = message;
    if (message.startsWith("/")) {
      // Remove the '/' and send just the command
      processedMessage = message.substring(1);
    }

    // Create and store AbortController for this request
    abortController = new AbortController();
    requestAbortControllers.set(requestId, abortController);

    const runtimeType = getRuntimeType();

    // Prepare environment with Windows-specific PATH handling
    const env = { ...process.env };
    const isWindows = getPlatform() === "windows";

    if (isWindows && runtimeType === "node") {
      // On Windows, ensure Node.js directory is in PATH
      const nodePath = process.execPath;
      const nodeDir = dirname(nodePath);
      const currentPath = env.PATH || env.Path || "";

      // Add Node.js directory to PATH if it's not already there
      if (!currentPath.includes(nodeDir)) {
        env.PATH = `${nodeDir};${currentPath}`;
        logger.chat.debug(`Added Node.js directory to PATH: ${nodeDir}`);
      }
    }

    const queryOptions = {
      abortController,
      executable: runtimeType,
      executableArgs: [],
      pathToClaudeCodeExecutable: cliPath,
      env,
      ...(sessionId ? { resume: sessionId } : {}),
      ...(allowedTools ? { allowedTools } : {}),
      ...(workingDirectory ? { cwd: workingDirectory } : {}),
      ...(permissionMode ? { permissionMode } : {}),
    };

    logger.chat.debug("Claude SDK query options: {options}", {
      options: queryOptions,
    });

    for await (const sdkMessage of query({
      prompt: processedMessage,
      options: queryOptions,
    })) {
      // Debug logging of raw SDK messages with detailed content
      logger.chat.debug("Claude SDK Message: {sdkMessage}", { sdkMessage });

      yield {
        type: "claude_json",
        data: sdkMessage,
      };
    }

    yield { type: "done" };
  } catch (error) {
    // Check if error is due to abort
    // TODO: Re-enable when AbortError is properly exported from Claude SDK
    // if (error instanceof AbortError) {
    //   yield { type: "aborted" };
    // } else {
    {
      logger.chat.error("Claude Code execution failed: {error}", { error });
      yield {
        type: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } finally {
    // Clean up AbortController from map
    if (requestAbortControllers.has(requestId)) {
      requestAbortControllers.delete(requestId);
    }
  }
}

/**
 * Handles POST /api/chat requests with streaming responses
 * @param c - Hono context object with config variables
 * @param requestAbortControllers - Shared map of abort controllers
 * @returns Response with streaming NDJSON
 */
export async function handleChatRequest(
  c: Context,
  requestAbortControllers: Map<string, AbortController>,
) {
  const chatRequest: ChatRequest = await c.req.json();
  const { cliPath } = c.var.config;

  logger.chat.debug(
    "Received chat request {*}",
    chatRequest as unknown as Record<string, unknown>,
  );

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of executeClaudeCommand(
          chatRequest.message,
          chatRequest.requestId,
          requestAbortControllers,
          cliPath, // Use detected CLI path from validateClaudeCli
          chatRequest.sessionId,
          chatRequest.allowedTools,
          chatRequest.workingDirectory,
          chatRequest.permissionMode,
        )) {
          const data = JSON.stringify(chunk) + "\n";
          controller.enqueue(new TextEncoder().encode(data));
        }
        controller.close();
      } catch (error) {
        const errorResponse: StreamResponse = {
          type: "error",
          error: error instanceof Error ? error.message : String(error),
        };
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify(errorResponse) + "\n"),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
