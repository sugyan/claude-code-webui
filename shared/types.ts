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

export interface ConversationHistory {
  sessionId: string;
  messages: FormattedMessage[]; // Backend formatted messages compatible with frontend
  metadata: {
    startTime: string;
    endTime: string;
    messageCount: number;
    continuedFrom?: string;
  };
}

// Backend message format - compatible with frontend ChatMessage interface
export interface FormattedMessage {
  type: "chat" | "system" | "tool" | "tool_result";
  role?: "user" | "assistant";
  content: string;
  timestamp: number;
  // Additional fields for specific message types
  subtype?: string;
  toolName?: string;
  summary?: string;
}
