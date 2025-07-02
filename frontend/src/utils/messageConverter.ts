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
      // Convert user message to ChatMessage
      const userMessage: ChatMessage = {
        type: "chat",
        role: "user",
        content: message.message,
        timestamp,
      };
      messages.push(userMessage);
      break;
    }

    case "assistant": {
      // Process assistant message content
      let assistantContent = "";
      const toolMessages: (ToolMessage | ToolResultMessage)[] = [];

      for (const item of message.message.content) {
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
        } else if (item.type === "tool_result") {
          const toolResult = item as {
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

          // Find the corresponding tool name from previous tool messages
          // In practice, we might need to maintain a map of tool_use_id to tool_name
          const toolResultMessage: ToolResultMessage = {
            type: "tool_result",
            toolName: "Tool", // Default name - in practice this would be resolved
            content: resultContent,
            summary: generateSummary(resultContent),
            timestamp,
          };
          toolMessages.push(toolResultMessage);
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
