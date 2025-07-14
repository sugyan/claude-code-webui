import { Context } from "hono";
import { AbortError, query } from "@anthropic-ai/claude-code";
import type { ChatRequest, StreamResponse } from "../../shared/types.ts";
import type { Runtime } from "../runtime/types.ts";

/**
 * Creates Claude Code execution configuration for the SDK
 * Uses the pre-resolved executable path from validation.ts (all wrappers already resolved)
 */
function getClaudeExecutionConfig(claudePath: string) {
  return {
    executable: "node" as const,
    executableArgs: [],
    pathToClaudeCodeExecutable: claudePath,
  };
}

/**
 * Executes a Claude command and yields streaming responses
 * @param message - User message or command
 * @param requestId - Unique request identifier for abort functionality
 * @param requestAbortControllers - Shared map of abort controllers
 * @param runtime - Runtime abstraction for system operations
 * @param claudePath - Path to claude executable (validated at startup)
 * @param sessionId - Optional session ID for conversation continuity
 * @param allowedTools - Optional array of allowed tool names
 * @param workingDirectory - Optional working directory for Claude execution
 * @param debugMode - Enable debug logging
 * @returns AsyncGenerator yielding StreamResponse objects
 */
async function* executeClaudeCommand(
  message: string,
  requestId: string,
  requestAbortControllers: Map<string, AbortController>,
  runtime: Runtime,
  claudePath: string,
  sessionId?: string,
  allowedTools?: string[],
  workingDirectory?: string,
  debugMode?: boolean,
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

    // Use the validated Claude path from startup configuration (passed as parameter)

    // Get Claude Code execution configuration (claudePath is pre-resolved by validation.ts)
    const executionConfig = getClaudeExecutionConfig(claudePath);

    for await (const sdkMessage of query({
      prompt: processedMessage,
      options: {
        abortController,
        ...executionConfig, // Use auto-detected execution configuration
        ...(sessionId ? { resume: sessionId } : {}),
        ...(allowedTools ? { allowedTools } : {}),
        ...(workingDirectory ? { cwd: workingDirectory } : {}),
      },
    })) {
      // Debug logging of raw SDK messages
      if (debugMode) {
        console.debug("[DEBUG] Claude SDK Message:");
        console.debug(JSON.stringify(sdkMessage, null, 2));
        console.debug("---");
      }

      yield {
        type: "claude_json",
        data: sdkMessage,
      };
    }

    yield { type: "done" };
  } catch (error) {
    // Check if error is due to abort
    if (error instanceof AbortError) {
      yield { type: "aborted" };
    } else {
      if (debugMode) {
        console.error("Claude Code execution failed:", error);
      }
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
  const { debugMode, runtime, claudePath } = c.var.config;

  if (debugMode) {
    console.debug(
      "[DEBUG] Received chat request:",
      JSON.stringify(chatRequest, null, 2),
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of executeClaudeCommand(
          chatRequest.message,
          chatRequest.requestId,
          requestAbortControllers,
          runtime,
          claudePath,
          chatRequest.sessionId,
          chatRequest.allowedTools,
          chatRequest.workingDirectory,
          debugMode,
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
