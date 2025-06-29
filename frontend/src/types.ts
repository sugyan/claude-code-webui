import type {
  SDKUserMessage,
  SDKAssistantMessage,
  SDKSystemMessage,
  SDKResultMessage,
} from "@anthropic-ai/claude-code";

// Chat message for user/assistant interactions (not part of SDKMessage)
export interface ChatMessage {
  type: "chat";
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// Error message for streaming errors
export type ErrorMessage = {
  type: "error";
  subtype: "stream_error";
  message: string;
  timestamp: number;
};

// Abort message for aborted operations
export type AbortMessage = {
  type: "system";
  subtype: "abort";
  message: string;
  timestamp: number;
};

// System message extending SDK types with timestamp
export type SystemMessage = (
  | SDKSystemMessage
  | SDKResultMessage
  | ErrorMessage
  | AbortMessage
) & {
  timestamp: number;
};

// Tool message for tool usage display
export type ToolMessage = {
  type: "tool";
  content: string;
  timestamp: number;
};

// Tool result message for tool result display
export type ToolResultMessage = {
  type: "tool_result";
  toolName: string;
  content: string;
  summary: string;
  timestamp: number;
};

// TimestampedSDKMessage types for conversation history API
// These extend Claude SDK types with timestamp information
type WithTimestamp<T> = T & { timestamp: string };

export type TimestampedSDKUserMessage = WithTimestamp<SDKUserMessage>;
export type TimestampedSDKAssistantMessage = WithTimestamp<SDKAssistantMessage>;
export type TimestampedSDKSystemMessage = WithTimestamp<SDKSystemMessage>;
export type TimestampedSDKResultMessage = WithTimestamp<SDKResultMessage>;

export type TimestampedSDKMessage =
  | TimestampedSDKUserMessage
  | TimestampedSDKAssistantMessage
  | TimestampedSDKSystemMessage
  | TimestampedSDKResultMessage;

export type AllMessage =
  | ChatMessage
  | SystemMessage
  | ToolMessage
  | ToolResultMessage;

// Type guard functions
export function isChatMessage(message: AllMessage): message is ChatMessage {
  return message.type === "chat";
}

export function isSystemMessage(message: AllMessage): message is SystemMessage {
  return (
    message.type === "system" ||
    message.type === "result" ||
    message.type === "error"
  );
}

export function isToolMessage(message: AllMessage): message is ToolMessage {
  return message.type === "tool";
}

export function isToolResultMessage(
  message: AllMessage,
): message is ToolResultMessage {
  return message.type === "tool_result";
}

// Re-export shared types
export type {
  StreamResponse,
  ChatRequest,
  ProjectsResponse,
  ProjectInfo,
} from "../../shared/types";

// Re-export SDK types
export type {
  SDKMessage,
  SDKSystemMessage,
  SDKResultMessage,
  SDKAssistantMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-code";
