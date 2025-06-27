/**
 * Message formatting utilities
 * Converts JSONL messages to timestamped SDK message format
 */

import type {
  SDKAssistantMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-code";
import type {
  TimestampedSDKAssistantMessage,
  TimestampedSDKMessage,
  TimestampedSDKResultMessage,
  TimestampedSDKSystemMessage,
  TimestampedSDKUserMessage,
} from "../../shared/types.ts";
import type { RawHistoryLine } from "./parser.ts";

/**
 * Convert a RawHistoryLine to TimestampedSDKMessage
 */
export function formatMessage(rawLine: RawHistoryLine): TimestampedSDKMessage {
  const timestamp = new Date(rawLine.timestamp).getTime();

  switch (rawLine.type) {
    case "user": {
      const userMessage: TimestampedSDKUserMessage = {
        type: "user",
        message: rawLine.message as SDKUserMessage["message"], // Cast to API message type
        parent_tool_use_id: null,
        session_id: rawLine.sessionId,
        timestamp,
      };
      return userMessage;
    }

    case "assistant": {
      const assistantMessage: TimestampedSDKAssistantMessage = {
        type: "assistant",
        message: rawLine.message as SDKAssistantMessage["message"], // Cast to API message type
        parent_tool_use_id: null,
        session_id: rawLine.sessionId,
        timestamp,
      };
      return assistantMessage;
    }

    case "system": {
      const systemMessage: TimestampedSDKSystemMessage = {
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
      return systemMessage;
    }

    case "result": {
      const resultMessage: TimestampedSDKResultMessage = {
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
      return resultMessage;
    }

    default: {
      // Fallback to system message
      const fallbackMessage: TimestampedSDKSystemMessage = {
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
      return fallbackMessage;
    }
  }
}

/**
 * Convert array of RawHistoryLines to TimestampedSDKMessages
 */
export function formatMessages(
  rawLines: RawHistoryLine[],
): TimestampedSDKMessage[] {
  return rawLines.map(formatMessage);
}

/**
 * Filter messages to only include specific types
 * Useful when frontend wants to display only certain message types
 */
export function filterMessagesByType<T extends TimestampedSDKMessage["type"]>(
  messages: TimestampedSDKMessage[],
  type: T,
): Extract<TimestampedSDKMessage, { type: T }>[] {
  return messages.filter((msg) => msg.type === type) as Extract<
    TimestampedSDKMessage,
    { type: T }
  >[];
}

/**
 * Filter messages to only include chat messages (user/assistant)
 * Useful when frontend only wants to display conversational content
 */
export function filterChatMessages(
  messages: TimestampedSDKMessage[],
): (TimestampedSDKUserMessage | TimestampedSDKAssistantMessage)[] {
  return messages.filter(
    (msg) => msg.type === "user" || msg.type === "assistant",
  ) as (TimestampedSDKUserMessage | TimestampedSDKAssistantMessage)[];
}
