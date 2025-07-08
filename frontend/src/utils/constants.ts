// UI Constants
export const UI_CONSTANTS = {
  NEAR_BOTTOM_THRESHOLD_PX: 100,
  TEXTAREA_MAX_HEIGHT: 200,
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  ABORT: "Escape",
  SUBMIT: "Enter",
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
  // Bash builtin commands that don't require permission
  BASH_BUILTINS: [
    "cd",
    "pwd",
    "echo",
    "export",
    "alias",
    "history",
    "jobs",
    "bg",
    "fg",
    "kill",
    "wait",
    "source",
    ".",
    "eval",
    "exec",
    "exit",
    "return",
    "shift",
    "break",
    "continue",
    "test",
    "[",
    "type",
    "which",
    "command",
    "builtin",
    "enable",
    "hash",
    "help",
    "local",
    "logout",
    "mapfile",
    "printf",
    "read",
    "readarray",
    "readonly",
    "set",
    "shopt",
    "suspend",
    "times",
    "trap",
    "ulimit",
    "umask",
    "unalias",
    "unset",
  ],
  // Command separators for compound commands
  COMMAND_SEPARATORS: ["&&", "||", ";", "|"],
} as const;
