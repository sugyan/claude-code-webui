/**
 * Message formatting utilities
 * Converts JSONL messages to frontend-compatible ChatMessage format
 */

import type { ParsedMessage } from "./parser.ts";
import type { FormattedMessage } from "../../shared/types.ts";

/**
 * Convert a ParsedMessage to frontend-compatible format
 */
export function formatMessage(parsedMessage: ParsedMessage): FormattedMessage {
  const timestamp = new Date(parsedMessage.timestamp).getTime();

  // Handle chat messages (user/assistant)
  if (
    parsedMessage.message?.role === "user" ||
    parsedMessage.message?.role === "assistant"
  ) {
    const content = extractMessageContent(parsedMessage.message.content);
    return {
      type: "chat",
      role: parsedMessage.message.role,
      content,
      timestamp,
    };
  }

  // Handle tool usage
  if (
    parsedMessage.type === "tool_use" ||
    (parsedMessage.message && "tool" in parsedMessage.message)
  ) {
    const toolInfo = extractToolInfo(parsedMessage);
    if (toolInfo.type === "tool_result") {
      return {
        type: "tool_result",
        content: toolInfo.content,
        timestamp,
        toolName: toolInfo.toolName,
        summary: toolInfo.summary,
      };
    } else {
      return {
        type: "tool",
        content: toolInfo.content,
        timestamp,
      };
    }
  }

  // Handle system messages and everything else
  return {
    type: "system",
    content: extractSystemMessage(parsedMessage),
    timestamp,
    subtype: parsedMessage.type || "unknown",
  };
}

/**
 * Extract text content from various message content formats
 */
function extractMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    // Handle array format (typical for Claude SDK messages)
    const textParts: string[] = [];

    for (const item of content) {
      if (typeof item === "string") {
        textParts.push(item);
      } else if (typeof item === "object" && item && "text" in item) {
        textParts.push(String(item.text));
      } else if (typeof item === "object" && item && "type" in item) {
        // Handle different content types
        if (item.type === "text" && "text" in item) {
          textParts.push(String(item.text));
        } else if (item.type === "tool_use" && "name" in item) {
          textParts.push(`[Tool: ${item.name}]`);
        }
      }
    }

    return textParts.join(" ");
  }

  if (typeof content === "object" && content && "text" in content) {
    return String(content.text);
  }

  // Fallback: stringify the content
  return JSON.stringify(content);
}

/**
 * Extract tool information from parsed message
 */
function extractToolInfo(parsedMessage: ParsedMessage): {
  type: "tool" | "tool_result";
  toolName: string;
  content: string;
  summary: string;
} {
  const fallback = {
    type: "tool" as const,
    toolName: "unknown",
    content: "Tool usage",
    summary: "Tool was used",
  };

  // Try to extract tool information from various possible structures
  const msg = parsedMessage.message || parsedMessage;

  if (typeof msg === "object" && msg && "tool" in msg) {
    const tool = msg.tool;
    if (typeof tool === "object" && tool && "name" in tool) {
      // Type assertion for tool object
      const toolObj = tool as Record<string, unknown>;
      return {
        type: "tool",
        toolName: String(tool.name),
        content: extractMessageContent(
          toolObj.input || toolObj.content || "Tool executed",
        ),
        summary: `Used ${tool.name}`,
      };
    }
  }

  // Check for tool results
  if (typeof msg === "object" && msg && "result" in msg) {
    const result = msg.result;
    return {
      type: "tool_result",
      toolName: extractToolName(msg) || "unknown",
      content: extractMessageContent(result),
      summary: "Tool execution completed",
    };
  }

  return fallback;
}

/**
 * Extract tool name from various message structures
 */
function extractToolName(msg: unknown): string | undefined {
  if (typeof msg === "object" && msg && "tool_name" in msg) {
    return String(msg.tool_name);
  }
  if (typeof msg === "object" && msg && "name" in msg) {
    return String(msg.name);
  }
  return undefined;
}

/**
 * Extract system message content
 */
function extractSystemMessage(parsedMessage: ParsedMessage): string {
  // Try message field first
  if (parsedMessage.message) {
    if (typeof parsedMessage.message === "string") {
      return parsedMessage.message;
    }
    if (typeof parsedMessage.message === "object") {
      return JSON.stringify(parsedMessage.message);
    }
  }

  // Fallback to type or generic message
  return parsedMessage.type || "System message";
}

/**
 * Convert array of ParsedMessages to frontend-compatible format
 */
export function formatMessages(
  parsedMessages: ParsedMessage[],
): FormattedMessage[] {
  return parsedMessages.map(formatMessage);
}

/**
 * Filter messages to only include chat messages (user/assistant)
 * Useful when frontend only wants to display conversational content
 */
export function filterChatMessages(
  formattedMessages: FormattedMessage[],
): FormattedMessage[] {
  return formattedMessages.filter((msg) => msg.type === "chat");
}
