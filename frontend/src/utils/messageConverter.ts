import type {
  AllMessage,
  ChatMessage,
  SystemMessage,
  ToolMessage,
  ToolResultMessage,
  TimestampedSDKMessage,
} from "../types";
import { MESSAGE_CONSTANTS } from "./constants";
import { formatToolArguments } from "./toolUtils";

/**
 * Converts a TimestampedSDKMessage from the backend to AllMessage format for frontend display
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

            const toolResultMessage: ToolResultMessage = {
              type: "tool_result",
              toolName: "Tool", // Default name
              content: resultContent,
              summary: generateSummary(resultContent),
              timestamp,
            };
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
            const toolMessage: ToolMessage = {
              type: "tool",
              content: `${toolUse.name}${formatToolArguments(toolUse.input)}`,
              timestamp,
            };
            toolMessages.push(toolMessage);
          }
          // Note: tool_result is handled in user messages, not assistant messages
        }
      }

      // Add tool messages first
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
      const systemMessage: SystemMessage = {
        ...message,
        timestamp,
      };
      messages.push(systemMessage);
      break;
    }

    case "result": {
      // Convert result message
      const resultMessage: SystemMessage = {
        ...message,
        timestamp,
      };
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
 * Converts an array of TimestampedSDKMessage to AllMessage format
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

// Generate a summary from tool result content (copied from useMessageProcessor)
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
 * Type guard to check if a message is a TimestampedSDKMessage
 */
export function isTimestampedSDKMessage(
  message: unknown,
): message is TimestampedSDKMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    "timestamp" in message &&
    typeof (message as { timestamp: unknown }).timestamp === "string"
  );
}
