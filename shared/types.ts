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

// Conversation history types
// Note: messages are typed as unknown[] to avoid frontend/backend dependency issues
// Frontend should cast to TimestampedSDKMessage[] (defined in frontend/src/types.ts)
export interface ConversationHistory {
  sessionId: string;
  messages: unknown[]; // TimestampedSDKMessage[] in practice, but avoiding frontend type dependency
  metadata: {
    startTime: string;
    endTime: string;
    messageCount: number;
  };
}

// Resume API types
export interface ResumeRequest {
  requestId: string;
  fromIndex?: number;
}

export interface ResumeResponse {
  messages: StreamResponse[];
  totalMessages: number;
  isComplete: boolean;
}

// Status API types
export const RequestStatus = {
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
  ABORTED: "aborted",
  NOT_FOUND: "not_found",
} as const;

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export interface StatusResponse {
  requestId: string;
  status: RequestStatus;
  totalMessages: number;
  lastUpdated: string;
}
