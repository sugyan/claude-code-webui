import { TOOL_CONSTANTS } from "./constants";

// Extract tool name and commands from previous context
export function extractToolInfo(
  toolName?: string,
  input?: Record<string, unknown>,
): { toolName: string; commands: string[] } {
  // Default tool name if not provided
  const extractedToolName = toolName || TOOL_CONSTANTS.DEFAULT_TOOL_NAME;

  // Extract commands from input for pattern matching
  let commands: string[] = [];

  // For Bash tool, parse command details
  if (
    extractedToolName === "Bash" &&
    input?.command &&
    typeof input.command === "string"
  ) {
    commands = extractBashCommands(input.command);
  } else if (extractedToolName === "ExitPlanMode") {
    commands = ["ExitPlanMode"];
  } else {
    commands = [TOOL_CONSTANTS.WILDCARD_COMMAND];
  }

  // Ensure commands is never empty for non-Bash tools
  if (extractedToolName !== "Bash" && commands.length === 0) {
    commands = [TOOL_CONSTANTS.WILDCARD_COMMAND];
  }

  return { toolName: extractedToolName, commands };
}

// Extract commands from compound Bash command string
function extractBashCommands(commandString: string): string[] {
  // Split by command separators
  const commandParts = splitCompoundCommand(commandString);

  // Extract base command from each part
  const rawCommands = commandParts
    .map((part) => extractSingleBashCommand(part.trim()))
    .filter(Boolean); // Remove empty commands only

  // Filter out bash builtins
  const filteredCommands = rawCommands.filter((cmd) => {
    return !(TOOL_CONSTANTS.BASH_BUILTINS as readonly string[]).includes(cmd);
  });

  // Fallback: if filtering results in empty array, use raw commands
  // This ensures we don't lose permission requests for edge cases like "command -v"
  const finalCommands =
    filteredCommands.length > 0 ? filteredCommands : rawCommands;

  // Return unique commands
  return [...new Set(finalCommands)];
}

// Split compound command by separators
function splitCompoundCommand(commandString: string): string[] {
  // Create regex pattern from separators
  const separatorPattern = TOOL_CONSTANTS.COMMAND_SEPARATORS.map((sep) =>
    sep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|");

  const regex = new RegExp(`\\s*(${separatorPattern})\\s*`);
  return commandString.split(regex).filter((part, index) => {
    // Keep only command parts, not separators
    return index % 2 === 0 && part.trim() !== "";
  });
}

// Extract single command from Bash command part
function extractSingleBashCommand(commandPart: string): string {
  const cmdParts = commandPart.split(/\s+/);

  // For known multi-word tools, take first 2 words
  if (
    cmdParts.length >= 2 &&
    TOOL_CONSTANTS.MULTI_WORD_COMMANDS.includes(
      cmdParts[0] as (typeof TOOL_CONSTANTS.MULTI_WORD_COMMANDS)[number],
    )
  ) {
    return cmdParts.slice(0, 2).join(" ");
  }

  // For everything else, take only the command name
  return cmdParts[0] || "";
}

// Generate tool patterns for permission checking
export function generateToolPatterns(
  toolName: string,
  commands: string[],
): string[] {
  if (toolName !== "Bash") {
    return [toolName];
  }

  // For Bash, generate pattern for each non-wildcard command
  return commands.map((command) =>
    command !== TOOL_CONSTANTS.WILDCARD_COMMAND
      ? `${toolName}(${command}:*)`
      : toolName,
  );
}

// Generate single tool pattern for backward compatibility
export function generateToolPattern(toolName: string, command: string): string {
  return toolName === "Bash" && command !== TOOL_CONSTANTS.WILDCARD_COMMAND
    ? `${toolName}(${command}:*)`
    : toolName;
}

// Format tool arguments for display
export function formatToolArguments(input?: Record<string, unknown>): string {
  if (!input) return "";

  // Special handling for common tool arguments
  if (input.path) return `(${input.path})`;
  if (input.file_path) return `(${input.file_path})`;
  if (input.command) return `(${input.command})`;
  if (input.pattern) return `(${input.pattern})`;
  if (input.url) return `(${input.url})`;

  // For other tools, show key arguments
  const keys = Object.keys(input);
  if (keys.length > 0) {
    const firstKey = keys[0];
    const value = input[firstKey];
    if (typeof value === "string" && value.length < 50) {
      return `(${value})`;
    } else {
      return `(${keys.length} ${keys.length === 1 ? "arg" : "args"})`;
    }
  }

  return "";
}
