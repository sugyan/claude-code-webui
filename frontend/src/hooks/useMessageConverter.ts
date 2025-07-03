import { useCallback } from "react";
import type {
  AllMessage,
  SystemMessage,
  ToolMessage,
  ToolResultMessage,
  SDKMessage,
  TimestampedSDKMessage,
} from "../types";
import {
  convertSystemMessage,
  convertResultMessage,
  createToolMessage,
  createToolResultMessage,
  convertTimestampedSDKMessage,
  convertConversationHistory,
} from "../utils/messageConversion";

/**
 * Unified message converter hook that provides both individual message conversion
 * and batch conversion capabilities. Used by both streaming and history loading.
 */
export function useMessageConverter() {
  const createSystemMessageCallback = useCallback(
    (claudeData: Extract<SDKMessage, { type: "system" }>): SystemMessage => {
      return convertSystemMessage(claudeData);
    },
    [],
  );

  const createToolMessageCallback = useCallback(
    (contentItem: {
      name?: string;
      input?: Record<string, unknown>;
    }): ToolMessage => {
      return createToolMessage(contentItem);
    },
    [],
  );

  const createResultMessageCallback = useCallback(
    (claudeData: Extract<SDKMessage, { type: "result" }>): SystemMessage => {
      return convertResultMessage(claudeData);
    },
    [],
  );

  const createToolResultMessageCallback = useCallback(
    (toolName: string, content: string): ToolResultMessage => {
      return createToolResultMessage(toolName, content);
    },
    [],
  );

  const convertTimestampedSDKMessageCallback = useCallback(
    (message: TimestampedSDKMessage): AllMessage[] => {
      return convertTimestampedSDKMessage(message);
    },
    [],
  );

  const convertConversationHistoryCallback = useCallback(
    (timestampedMessages: TimestampedSDKMessage[]): AllMessage[] => {
      return convertConversationHistory(timestampedMessages);
    },
    [],
  );

  return {
    // Individual message creators (for streaming)
    createSystemMessage: createSystemMessageCallback,
    createToolMessage: createToolMessageCallback,
    createResultMessage: createResultMessageCallback,
    createToolResultMessage: createToolResultMessageCallback,

    // Batch converters (for history loading)
    convertTimestampedSDKMessage: convertTimestampedSDKMessageCallback,
    convertConversationHistory: convertConversationHistoryCallback,
  };
}
