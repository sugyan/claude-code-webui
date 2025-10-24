import { Context } from "hono";
import { query, type PermissionMode, type SDKUserMessage } from "@anthropic-ai/claude-code";
import type { ChatRequest, StreamResponse, MultimodalMessage, ImageData } from "../../shared/types.ts";
import { logger } from "../utils/logger.ts";
import { getPlatform } from "../utils/os.ts";

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
 * Type guard to check if a message is multimodal
 */
function isMultimodalMessage(message: string | MultimodalMessage): message is MultimodalMessage {
  return typeof message === 'object' && message !== null && 'text' in message && 'images' in message;
}

/**
 * Creates an SDKUserMessage from multimodal content
 */
function createMultimodalSDKMessage(message: MultimodalMessage, sessionId?: string): SDKUserMessage {
  // Build content array with text and images
  const content = [];
  
  // Add text content if present
  if (message.text.trim()) {
    content.push({
      type: 'text' as const,
      text: message.text
    });
  }
  
  // Add image content blocks
  for (const image of message.images) {
    content.push({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: image.type,
        data: image.data
      }
    });
  }
  
  return {
    type: 'user' as const,
    message: {
      role: 'user' as const,
      content: content
    },
    session_id: sessionId || '',
    parent_tool_use_id: null
  };
}

/**
 * Creates an async iterable from a single SDKUserMessage
 */
async function* createSDKMessageIterable(sdkMessage: SDKUserMessage): AsyncIterable<SDKUserMessage> {
  yield sdkMessage;
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
  message: string | MultimodalMessage,
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
    // Create and store AbortController for this request
    abortController = new AbortController();
    requestAbortControllers.set(requestId, abortController);

    const runtimeType = getRuntimeType();
    const queryOptions = {
      abortController,
      executable: runtimeType,
      executableArgs: [],
      pathToClaudeCodeExecutable: cliPath,
      env: { ...process.env },
      ...(sessionId ? { resume: sessionId } : {}),
      ...(allowedTools ? { allowedTools } : {}),
      ...(workingDirectory ? { cwd: workingDirectory } : {}),
      ...(permissionMode ? { permissionMode } : {}),
    };

    logger.chat.debug("Claude SDK query options: {options}", { options: queryOptions });

    // Handle multimodal vs text-only messages
    if (isMultimodalMessage(message)) {
      // Multimodal message with images
      logger.chat.debug("Processing multimodal message with {imageCount} images", { imageCount: message.images.length });
      
      const sdkMessage = createMultimodalSDKMessage(message, sessionId);
      const messageIterable = createSDKMessageIterable(sdkMessage);
      
      for await (const sdkMessage of query({
        prompt: messageIterable,
        options: queryOptions,
      })) {
        logger.chat.debug("Claude SDK Message: {sdkMessage}", { sdkMessage });
        yield {
          type: "claude_json",
          data: sdkMessage,
        };
      }
    } else {
      // Text-only message
      let processedMessage = message;
      if (message.startsWith("/")) {
        processedMessage = message.substring(1);
      }
      
      logger.chat.debug("Processing text-only message");
      
      for await (const sdkMessage of query({
        prompt: processedMessage,
        options: queryOptions,
      })) {
        logger.chat.debug("Claude SDK Message: {sdkMessage}", { sdkMessage });
        yield {
          type: "claude_json",
          data: sdkMessage,
        };
      }
    }

    yield { type: "done" };
  } catch (error) {
    logger.chat.error("Claude Code execution failed: {error}", { error });
    yield {
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    };
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
