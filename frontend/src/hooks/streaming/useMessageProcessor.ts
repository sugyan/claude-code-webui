import { useCallback } from "react";
import type {
  AllMessage,
  ChatMessage,
  SystemMessage,
  ToolMessage,
  ToolResultMessage,
  SDKMessage,
  TimestampedSDKMessage,
} from "../../types";
import { MESSAGE_CONSTANTS } from "../../utils/constants";
import { formatToolArguments } from "../../utils/toolUtils";

export interface StreamingContext {
  currentAssistantMessage: ChatMessage | null;
  setCurrentAssistantMessage: (msg: ChatMessage | null) => void;
  addMessage: (msg: AllMessage) => void;
  updateLastMessage: (content: string) => void;
  onSessionId?: (sessionId: string) => void;
  shouldShowInitMessage?: () => boolean;
  onInitMessageShown?: () => void;
  hasReceivedInit?: boolean;
  setHasReceivedInit?: (received: boolean) => void;
  onPermissionError?: (
    toolName: string,
    pattern: string,
    toolUseId: string,
  ) => void;
  onAbortRequest?: () => void;
}

export function useMessageProcessor() {
  const createSystemMessage = useCallback(
    (claudeData: Extract<SDKMessage, { type: "system" }>): SystemMessage => {
      return {
        ...claudeData,
        timestamp: Date.now(),
      };
    },
    [],
  );

  const createToolMessage = useCallback(
    (contentItem: {
      name?: string;
      input?: Record<string, unknown>;
    }): ToolMessage => {
      const toolName = contentItem.name || "Unknown";
      const argsDisplay = formatToolArguments(contentItem.input);

      return {
        type: "tool",
        content: `${toolName}${argsDisplay}`,
        timestamp: Date.now(),
      };
    },
    [],
  );

  const createResultMessage = useCallback(
    (claudeData: Extract<SDKMessage, { type: "result" }>): SystemMessage => {
      return {
        ...claudeData,
        timestamp: Date.now(),
      };
    },
    [],
  );

  const createToolResultMessage = useCallback(
    (toolName: string, content: string): ToolResultMessage => {
      const summary = generateSummary(content);

      return {
        type: "tool_result",
        toolName,
        content,
        summary,
        timestamp: Date.now(),
      };
    },
    [],
  );

  const convertTimestampedSDKMessage = useCallback(
    (message: TimestampedSDKMessage): AllMessage[] => {
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
          console.warn(
            "Unknown message type:",
            (message as { type: string }).type,
          );
          break;
        }
      }

      return messages;
    },
    [],
  );

  const convertConversationHistory = useCallback(
    (timestampedMessages: TimestampedSDKMessage[]): AllMessage[] => {
      const allMessages: AllMessage[] = [];

      for (const message of timestampedMessages) {
        const converted = convertTimestampedSDKMessage(message);
        allMessages.push(...converted);
      }

      return allMessages;
    },
    [convertTimestampedSDKMessage],
  );

  return {
    createSystemMessage,
    createToolMessage,
    createResultMessage,
    createToolResultMessage,
    convertTimestampedSDKMessage,
    convertConversationHistory,
  };
}

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
