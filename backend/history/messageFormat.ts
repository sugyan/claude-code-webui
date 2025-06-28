/**
 * Message formatting utilities
 * Converts JSONL messages to unknown objects for frontend compatibility
 */

import type {
  SDKAssistantMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-code";
import type { RawHistoryLine } from "./parser.ts";

// Basic interface for typed message access
interface BasicMessage {
  type: string;
}

/**
 * Convert a RawHistoryLine to unknown object (TimestampedSDKMessage compatible)
 */
export function formatMessage(rawLine: RawHistoryLine): unknown {
  const timestamp = new Date(rawLine.timestamp).getTime();

  switch (rawLine.type) {
    case "user": {
      return {
        type: "user",
        message: rawLine.message as SDKUserMessage["message"], // Cast to API message type
        parent_tool_use_id: null,
        session_id: rawLine.sessionId,
        timestamp,
      };
    }

    case "assistant": {
      return {
        type: "assistant",
        message: rawLine.message as SDKAssistantMessage["message"], // Cast to API message type
        parent_tool_use_id: null,
        session_id: rawLine.sessionId,
        timestamp,
      };
    }

    case "system": {
      return {
        type: "system",
        subtype: "init",
        apiKeySource: "user", // Default value
        cwd: rawLine.cwd || "",
        session_id: rawLine.sessionId,
        tools: [],
        mcp_servers: [],
        model: "claude-3-5-sonnet-20241022", // Default value
        permissionMode: "default",
        timestamp,
      };
    }

    case "result": {
      return {
        type: "result",
        subtype: "success",
        duration_ms: 0,
        duration_api_ms: 0,
        is_error: false,
        num_turns: 1,
        result: "Result",
        session_id: rawLine.sessionId,
        total_cost_usd: 0,
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        timestamp,
      };
    }

    default: {
      // Fallback to system message
      return {
        type: "system",
        subtype: "init",
        apiKeySource: "user",
        cwd: rawLine.cwd || "",
        session_id: rawLine.sessionId,
        tools: [],
        mcp_servers: [],
        model: "claude-3-5-sonnet-20241022",
        permissionMode: "default",
        timestamp,
      };
    }
  }
}

/**
 * Convert array of RawHistoryLines to unknown[] (TimestampedSDKMessage compatible)
 */
export function formatMessages(
  rawLines: RawHistoryLine[],
): unknown[] {
  return rawLines.map(formatMessage);
}

/**
 * Filter messages to only include specific types
 * Useful when frontend wants to display only certain message types
 */
export function filterMessagesByType(
  messages: unknown[],
  type: string,
): unknown[] {
  return messages.filter((msg) => (msg as BasicMessage).type === type);
}

/**
 * Filter messages to only include chat messages (user/assistant)
 * Useful when frontend only wants to display conversational content
 */
export function filterChatMessages(
  messages: unknown[],
): unknown[] {
  return messages.filter(
    (msg) => {
      const basicMsg = msg as BasicMessage;
      return basicMsg.type === "user" || basicMsg.type === "assistant";
    },
  );
}
