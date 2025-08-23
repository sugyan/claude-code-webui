// UI Constants
export const UI_CONSTANTS = {
  NEAR_BOTTOM_THRESHOLD_PX: 100,
  TEXTAREA_MAX_HEIGHT: 200,
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  ABORT: "Escape",
  SUBMIT: "Enter",
  PERMISSION_MODE_TOGGLE: "M",
} as const;

// Message display constants
export const MESSAGE_CONSTANTS = {
  MAX_DISPLAY_WIDTH: {
    MOBILE: "85%",
    DESKTOP: "70%",
  },
  SUMMARY_MAX_LENGTH: 50,
  SESSION_ID_DISPLAY_LENGTH: 8,
} as const;

// Tool-related constants
export const TOOL_CONSTANTS = {
  MULTI_WORD_COMMANDS: ["cargo", "git", "npm", "yarn", "docker"],
  WILDCARD_COMMAND: "*",
  DEFAULT_TOOL_NAME: "Unknown",
  // Bash builtin commands that don't require permission (conservative list)
  // Only include commands that are purely internal navigation/state and never need external access
  BASH_BUILTINS: [
    "cd", // Change directory - internal navigation only
    "pwd", // Print working directory - internal state only
    "export", // Set environment variables - internal state only
    "unset", // Unset environment variables - internal state only
    "alias", // Set command aliases - internal state only
    "unalias", // Remove command aliases - internal state only
    "history", // Show command history - internal state only
    "jobs", // List active jobs - internal state only
    "bg", // Move jobs to background - internal process control
    "fg", // Move jobs to foreground - internal process control
    "exit", // Exit shell - internal control
    "return", // Return from function - internal control
    "shift", // Shift positional parameters - internal control
    "break", // Break from loop - internal control
    "continue", // Continue loop - internal control
    "which", // Which command - safe builtin that doesn't require permission
  ],
  // Command separators for compound commands
  COMMAND_SEPARATORS: ["&&", "||", ";", "|"],
} as const;
