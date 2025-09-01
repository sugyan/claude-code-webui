import type {
  AllMessage,
  SystemMessage,
  ToolMessage,
  ToolResultMessage,
  ThinkingMessage,
  TodoMessage,
  TodoItem,
  SDKMessage,
  TimestampedSDKMessage,
} from "../types";
import { MESSAGE_CONSTANTS } from "./constants";
import { formatToolArguments } from "./toolUtils";
import { UnifiedMessageProcessor } from "./UnifiedMessageProcessor";

// Generate a summary from tool result content
function generateSummary(content: string): string {
  if (content.includes("\n")) {
    const lines = content.split("\n").filter((line) => line.trim());
    if (lines.length > 0) {
      return `${lines.length} ${lines.length === 1 ? "line" : "lines"}`;
    }
  } else if (content.includes("Found")) {
    const match = content.match(/Found (\d+)/);
    if (match) {
      return `Found ${match[1]}`;
    }
  } else if (content.includes("files")) {
    const match = content.match(/(\d+)\s+files?/);
    if (match) {
      return `${match[1]} files`;
    }
  } else if (content.length < MESSAGE_CONSTANTS.SUMMARY_MAX_LENGTH) {
    return content.trim();
  }

  return `${content.length} chars`;
}

/**
 * Convert a system SDKMessage to SystemMessage
 */
export function convertSystemMessage(
  claudeData: Extract<SDKMessage, { type: "system" }>,
  timestamp?: number,
): SystemMessage {
  return {
    ...claudeData,
    timestamp: timestamp ?? Date.now(),
  };
}

/**
 * Convert a result SDKMessage to SystemMessage
 */
export function convertResultMessage(
  claudeData: Extract<SDKMessage, { type: "result" }>,
  timestamp?: number,
): SystemMessage {
  return {
    ...claudeData,
    timestamp: timestamp ?? Date.now(),
  };
}

/**
 * Create a tool message from content item
 */
export function createToolMessage(
  contentItem: {
    name?: string;
    input?: Record<string, unknown>;
  },
  timestamp?: number,
): ToolMessage {
  const toolName = contentItem.name || "Unknown";
  const argsDisplay = formatToolArguments(contentItem.input);

  return {
    type: "tool",
    content: `${toolName}${argsDisplay}`,
    timestamp: timestamp ?? Date.now(),
  };
}

/**
 * Create a tool result message
 */
export function createToolResultMessage(
  toolName: string,
  content: string,
  timestamp?: number,
  toolUseResult?: unknown,
): ToolResultMessage {
  const summary = generateSummary(content);

  return {
    type: "tool_result",
    toolName,
    content,
    summary,
    timestamp: timestamp ?? Date.now(),
    toolUseResult,
  };
}

/**
 * Create a thinking message from content item
 */
export function createThinkingMessage(
  thinkingContent: string,
  timestamp?: number,
): ThinkingMessage {
  return {
    type: "thinking",
    content: thinkingContent,
    timestamp: timestamp ?? Date.now(),
  };
}

/**
 * Validate if an object matches the TodoItem interface
 */
function isValidTodoItem(item: unknown): item is TodoItem {
  if (typeof item !== "object" || item === null) {
    return false;
  }

  const obj = item as Record<string, unknown>;
  return (
    typeof obj.content === "string" &&
    typeof obj.status === "string" &&
    ["pending", "in_progress", "completed"].includes(obj.status) &&
    typeof obj.activeForm === "string"
  );
}

/**
 * Parse TodoWrite tool result content to extract todo data
 */
export function extractTodoDataFromInput(
  input: Record<string, unknown>,
): TodoItem[] | null {
  try {
    if (input.todos && Array.isArray(input.todos)) {
      // Validate each item before casting
      if (input.todos.every(isValidTodoItem)) {
        return input.todos as TodoItem[];
      } else {
        console.debug("Invalid todo item structure in input:", input.todos);
        return null;
      }
    }
  } catch (error) {
    console.debug("Failed to extract todo data from input:", error);
  }
  return null;
}

/**
 * Check if content appears to be from TodoWrite tool
 */
export function isTodoWriteContent(content: string): boolean {
  return (
    content.includes("toolUseResult") &&
    (content.includes("newTodos") || content.includes("oldTodos")) &&
    content.includes("Todos have been modified successfully")
  );
}

/**
 * Create a todo message from TodoWrite tool use input
 */
export function createTodoMessageFromInput(
  input: Record<string, unknown>,
  timestamp?: number,
): TodoMessage | null {
  const todos = extractTodoDataFromInput(input);
  if (!todos) {
    return null;
  }

  return {
    type: "todo",
    todos,
    timestamp: timestamp ?? Date.now(),
  };
}

/**
 * Create a todo message from TodoWrite tool result content (legacy - for history conversion)
 */
export function createTodoMessage(
  content: string,
  timestamp?: number,
): TodoMessage | null {
  // This is now primarily for historical data conversion
  try {
    const parsed = JSON.parse(content);
    if (parsed.newTodos && Array.isArray(parsed.newTodos)) {
      return {
        type: "todo",
        todos: parsed.newTodos as TodoItem[],
        timestamp: timestamp ?? Date.now(),
      };
    }
  } catch (error) {
    console.debug("Failed to parse todo content:", error);
  }
  return null;
}

/**
 * Convert a TimestampedSDKMessage to AllMessage array
 * This is the core conversion logic used by both streaming and history loading
 * Now uses UnifiedMessageProcessor for consistent behavior across pipelines
 */
export function convertTimestampedSDKMessage(
  message: TimestampedSDKMessage,
): AllMessage[] {
  const processor = new UnifiedMessageProcessor();

  // Use the unified processor to convert the message
  return processor.processMessage(
    message,
    {
      addMessage: () => {}, // Not used in batch mode
    },
    {
      isStreaming: false,
      timestamp: new Date(message.timestamp).getTime(),
    },
  );
}

/**
 * Convert an array of TimestampedSDKMessages to AllMessage array
 * Used for batch conversion of conversation history
 * Now uses UnifiedMessageProcessor's batch processing for optimal performance and consistency
 */
export function convertConversationHistory(
  timestampedMessages: TimestampedSDKMessage[],
): AllMessage[] {
  const processor = new UnifiedMessageProcessor();

  // Use the unified processor's batch processing method
  return processor.processMessagesBatch(timestampedMessages);
}
