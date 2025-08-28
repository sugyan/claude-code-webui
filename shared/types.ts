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
  permissionMode?: "default" | "plan" | "acceptEdits";
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

// User switching types
export interface UserInfo {
  username: string;
  uid: number;
  gid: number;
  homeDirectory: string;
  shell: string;
  hasShellAccess: boolean;
}

export interface PrivilegeInfo {
  isRoot: boolean;
  hasSudo: boolean;
  currentUser: string;
  uid: number;
  gid: number;
}

export interface UserSwitchRequest {
  targetUser: string;
}

export interface PrivilegeCheckResponse {
  success: boolean;
  privileges?: PrivilegeInfo;
  error?: string;
}

export interface ListUsersResponse {
  success: boolean;
  users?: UserInfo[];
  currentUser?: string;
  error?: string;
}

export interface UserSwitchResponse {
  success: boolean;
  message?: string;
  targetUser?: string;
  currentUser?: string;
  user?: any; // New user data
  token?: string; // New auth token
  expiresAt?: number; // Token expiration
  switched?: boolean; // Flag indicating actual session switch
  error?: string;
}

// User management types
export interface UserDetails {
  username: string;
  uid: number;
  gid: number;
  homeDirectory: string;
  shell: string;
  email?: string;
  lastLogin?: string;
  accountLocked?: boolean;
  passwordExpiry?: string;
  groups?: string[];
}

export interface UserManagementRequest {
  username: string;
  action: "updatePassword" | "updateEmail" | "updateHomePath" | "toggleShell" | "getUserDetails";
  newPassword?: string;
  newEmail?: string;
  newHomePath?: string;
  enableShell?: boolean;
}

export interface UserManagementResponse {
  success: boolean;
  message?: string;
  user?: UserDetails;
  error?: string;
}
