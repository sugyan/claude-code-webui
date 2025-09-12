// API configuration - uses relative paths with Vite proxy in development
export const API_CONFIG = {
  ENDPOINTS: {
    CHAT: "/api/chat",
    ABORT: "/api/abort",
    PROJECTS: "/api/projects",
    CLAUDE_PROJECTS: "/api/claude/projects",
    HISTORIES: "/api/projects",
    CONVERSATIONS: "/api/projects",
  },
} as const;

// Helper function to get full API URL
export const getApiUrl = (endpoint: string) => {
  return endpoint;
};

// Helper function to get abort URL
export const getAbortUrl = (requestId: string) => {
  return `${API_CONFIG.ENDPOINTS.ABORT}/${requestId}`;
};

// Helper function to get chat URL
export const getChatUrl = () => {
  return API_CONFIG.ENDPOINTS.CHAT;
};

// Helper function to get projects URL
export const getProjectsUrl = () => {
  return API_CONFIG.ENDPOINTS.PROJECTS;
};

// Helper function to get histories URL
export const getHistoriesUrl = (projectPath: string) => {
  const encodedPath = encodeURIComponent(projectPath);
  return `${API_CONFIG.ENDPOINTS.HISTORIES}/${encodedPath}/histories`;
};

// Helper function to get conversation URL
export const getConversationUrl = (
  encodedProjectName: string,
  sessionId: string,
) => {
  return `${API_CONFIG.ENDPOINTS.CONVERSATIONS}/${encodedProjectName}/histories/${sessionId}`;
};

// Helper function to get Claude projects URL
export const getClaudeProjectsUrl = () => {
  return API_CONFIG.ENDPOINTS.CLAUDE_PROJECTS;
};

// Helper function to get Claude project conversations URL
export const getClaudeProjectConversationsUrl = (encodedProjectName: string) => {
  return `${API_CONFIG.ENDPOINTS.CLAUDE_PROJECTS}/${encodedProjectName}/conversations`;
};
