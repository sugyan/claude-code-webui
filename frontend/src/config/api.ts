// API configuration - uses relative paths with Vite proxy in development
export const API_CONFIG = {
  ENDPOINTS: {
    CHAT: "/api/chat",
    ABORT: "/api/abort",
    PROJECTS: "/api/projects",
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
