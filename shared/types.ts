export interface StreamResponse {
  type: "claude_json" | "error" | "done" | "aborted";
  data?: unknown; // SDKMessage object for claude_json type
  error?: string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  requestId: string;
  allowedTools?: string[];
  workingDirectory?: string;
}

export interface AbortRequest {
  requestId: string;
}

export interface ProjectInfo {
  path: string;
  encodedName: string;
}

export interface ProjectsResponse {
  projects: ProjectInfo[];
}

// Conversation history types
export interface ConversationSummary {
  sessionId: string;
  startTime: string;
  lastTime: string;
  messageCount: number;
  lastMessagePreview: string;
}

export interface HistoryListResponse {
  conversations: ConversationSummary[];
}

// Import SDK types
import type {
  SDKMessage,
  SDKUserMessage,
  SDKAssistantMessage,
  SDKSystemMessage,
  SDKResultMessage,
} from "@anthropic-ai/claude-code";

// SDK messages with timestamp added as number (milliseconds since epoch)
export type TimestampedSDKUserMessage = SDKUserMessage & { timestamp: number };
export type TimestampedSDKAssistantMessage = SDKAssistantMessage & { timestamp: number };
export type TimestampedSDKSystemMessage = SDKSystemMessage & { timestamp: number };
export type TimestampedSDKResultMessage = SDKResultMessage & { timestamp: number };

export type TimestampedSDKMessage = 
  | TimestampedSDKUserMessage 
  | TimestampedSDKAssistantMessage 
  | TimestampedSDKSystemMessage 
  | TimestampedSDKResultMessage;

export interface ConversationHistory {
  sessionId: string;
  messages: TimestampedSDKMessage[]; // SDK-based messages with timestamp
  metadata: {
    startTime: string;
    endTime: string;
    messageCount: number;
    continuedFrom?: string;
  };
}
