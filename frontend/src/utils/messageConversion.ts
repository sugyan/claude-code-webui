import type {
  AllMessage,
  ChatMessage,
  SystemMessage,
  ToolMessage,
  ToolResultMessage,
  ThinkingMessage,
  SDKMessage,
  TimestampedSDKMessage,
} from "../types";
import { MESSAGE_CONSTANTS } from "./constants";
import { formatToolArguments } from "./toolUtils";
import { isThinkingContentItem } from "./messageTypes";

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
): ToolResultMessage {
  const summary = generateSummary(content);

  return {
    type: "tool_result",
    toolName,
    content,
    summary,
    timestamp: timestamp ?? Date.now(),
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
 * Convert a TimestampedSDKMessage to AllMessage array
 * This is the core conversion logic used by both streaming and history loading
 */
export function convertTimestampedSDKMessage(
  message: TimestampedSDKMessage,
): AllMessage[] {
  const messages: AllMessage[] = [];
  const timestamp = new Date(message.timestamp).getTime();

  switch (message.type) {
    case "user": {
      // Convert user message - check if it contains tool_result or regular text content
      const sdkUserMessage = message as Extract<
        TimestampedSDKMessage,
        { type: "user" }
      >;

      const messageContent = sdkUserMessage.message.content;

      if (Array.isArray(messageContent)) {
        for (const contentItem of messageContent) {
          if (contentItem.type === "tool_result") {
            // Create tool result message
            const toolResult = contentItem as {
              tool_use_id: string;
              content: string | Array<{ type: string; text?: string }>;
            };

            let resultContent = "";
            if (typeof toolResult.content === "string") {
              resultContent = toolResult.content;
            } else if (Array.isArray(toolResult.content)) {
              resultContent = toolResult.content
                .map((c) => c.text || "")
                .join("");
            }

            const toolResultMessage = createToolResultMessage(
              "Tool", // Default name
              resultContent,
              timestamp,
            );
            messages.push(toolResultMessage);
          } else if (contentItem.type === "text") {
            // Regular text content
            const userMessage: ChatMessage = {
              type: "chat",
              role: "user",
              content: (contentItem as { text: string }).text,
              timestamp,
            };
            messages.push(userMessage);
          }
        }
      } else if (typeof messageContent === "string") {
        // Simple string content
        const userMessage: ChatMessage = {
          type: "chat",
          role: "user",
          content: messageContent,
          timestamp,
        };
        messages.push(userMessage);
      }
      break;
    }

    case "assistant": {
      // Process assistant message content
      const sdkAssistantMessage = message as Extract<
        TimestampedSDKMessage,
        { type: "assistant" }
      >;
      let assistantContent = "";
      const toolMessages: (ToolMessage | ToolResultMessage)[] = [];
      const thinkingMessages: ThinkingMessage[] = [];

      // Check if message.content exists and is an array
      if (
        sdkAssistantMessage.message?.content &&
        Array.isArray(sdkAssistantMessage.message.content)
      ) {
        for (const item of sdkAssistantMessage.message.content) {
          if (item.type === "text") {
            assistantContent += (item as { text: string }).text;
          } else if (item.type === "tool_use") {
            const toolUse = item as {
              name: string;
              input: Record<string, unknown>;
              id: string;
            };

            // Create tool usage message
            const toolMessage = createToolMessage(toolUse, timestamp);
            toolMessages.push(toolMessage);
          } else if (isThinkingContentItem(item)) {
            // Create thinking message
            const thinkingMessage = createThinkingMessage(
              item.thinking,
              timestamp,
            );
            thinkingMessages.push(thinkingMessage);
          }
          // Note: tool_result is handled in user messages, not assistant messages
        }
      }

      // Add thinking messages first (reasoning comes before action)
      messages.push(...thinkingMessages);

      // Add tool messages second
      messages.push(...toolMessages);

      // Add assistant text message if there is text content
      if (assistantContent.trim()) {
        const assistantMessage: ChatMessage = {
          type: "chat",
          role: "assistant",
          content: assistantContent.trim(),
          timestamp,
        };
        messages.push(assistantMessage);
      }
      break;
    }

    case "system": {
      // Convert system message
      const systemMessage = convertSystemMessage(message, timestamp);
      messages.push(systemMessage);
      break;
    }

    case "result": {
      // Convert result message
      const resultMessage = convertResultMessage(message, timestamp);
      messages.push(resultMessage);
      break;
    }

    default: {
      console.warn("Unknown message type:", (message as { type: string }).type);
      break;
    }
  }

  return messages;
}

/**
 * Convert an array of TimestampedSDKMessages to AllMessage array
 * Used for batch conversion of conversation history
 */
export function convertConversationHistory(
  timestampedMessages: TimestampedSDKMessage[],
): AllMessage[] {
  const allMessages: AllMessage[] = [];

  for (const message of timestampedMessages) {
    const converted = convertTimestampedSDKMessage(message);
    allMessages.push(...converted);
  }

  return allMessages;
}
