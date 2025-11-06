import { useState, useEffect, useCallback } from "react";
import type { AllMessage, TimestampedSDKMessage } from "../types";
import type { ConversationHistory } from "../../../shared/types";
import { getConversationUrl } from "../config/api";
import { useMessageConverter } from "./useMessageConverter";
import { useSessionCache } from "./useSessionCache";

interface CachedHistoryLoaderState {
  messages: AllMessage[];
  loading: boolean;
  error: string | null;
  sessionId: string | null;
  fromCache: boolean;
  scrollPosition?: number;
}

interface CachedHistoryLoaderResult extends CachedHistoryLoaderState {
  loadHistory: (
    projectPath: string,
    encodedProjectName: string,
    sessionId: string,
  ) => Promise<void>;
  clearHistory: () => void;
}

// Type guard to check if a message is a TimestampedSDKMessage
function isTimestampedSDKMessage(
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

/**
 * Hook for loading conversation history with caching support
 */
export function useCachedHistoryLoader(): CachedHistoryLoaderResult {
  const [state, setState] = useState<CachedHistoryLoaderState>({
    messages: [],
    loading: false,
    error: null,
    sessionId: null,
    fromCache: false,
    scrollPosition: undefined,
  });

  const { convertConversationHistory } = useMessageConverter();
  const { getCachedSession, setCachedSession } = useSessionCache();

  const loadHistory = useCallback(
    async (
      projectPath: string,
      encodedProjectName: string,
      sessionId: string,
    ) => {
      if (!projectPath || !encodedProjectName || !sessionId) {
        setState((prev) => ({
          ...prev,
          error:
            "Project path, encoded project name and session ID are required",
        }));
        return;
      }

      // Check cache first
      const cached = getCachedSession(projectPath, sessionId);
      if (cached) {
        setState({
          messages: cached.messages,
          loading: false,
          error: null,
          sessionId: cached.sessionId,
          fromCache: true,
          scrollPosition: cached.scrollPosition,
        });
        return;
      }

      // Not in cache, load from server
      try {
        setState((prev) => ({
          ...prev,
          loading: true,
          error: null,
          fromCache: false,
        }));

        const response = await fetch(
          getConversationUrl(encodedProjectName, sessionId),
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load conversation: ${response.status} ${response.statusText}`,
          );
        }

        const conversationHistory: ConversationHistory = await response.json();

        // Validate the response structure
        if (
          !conversationHistory.messages ||
          !Array.isArray(conversationHistory.messages)
        ) {
          throw new Error("Invalid conversation history format");
        }

        // Convert unknown[] to TimestampedSDKMessage[] with type checking
        const timestampedMessages: TimestampedSDKMessage[] = [];
        for (const msg of conversationHistory.messages) {
          if (isTimestampedSDKMessage(msg)) {
            timestampedMessages.push(msg);
          } else {
            console.warn("Skipping invalid message in history:", msg);
          }
        }

        // Convert to frontend message format
        const convertedMessages =
          convertConversationHistory(timestampedMessages);

        // Cache the loaded session
        setCachedSession(projectPath, sessionId, convertedMessages);

        setState({
          messages: convertedMessages,
          loading: false,
          error: null,
          sessionId: conversationHistory.sessionId,
          fromCache: false,
          scrollPosition: undefined, // No scroll position for fresh loads
        });
      } catch (error) {
        console.error("Error loading conversation history:", error);

        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load conversation history",
          fromCache: false,
          scrollPosition: undefined,
        }));
      }
    },
    [convertConversationHistory, getCachedSession, setCachedSession],
  );

  const clearHistory = useCallback(() => {
    setState({
      messages: [],
      loading: false,
      error: null,
      sessionId: null,
      fromCache: false,
      scrollPosition: undefined,
    });
  }, []);

  return {
    ...state,
    loadHistory,
    clearHistory,
  };
}

/**
 * Hook for loading conversation history on mount when sessionId is provided with caching
 */
export function useAutoCachedHistoryLoader(
  projectPath?: string,
  encodedProjectName?: string,
  sessionId?: string,
): CachedHistoryLoaderResult {
  const historyLoader = useCachedHistoryLoader();

  useEffect(() => {
    if (projectPath && encodedProjectName && sessionId) {
      historyLoader.loadHistory(projectPath, encodedProjectName, sessionId);
    } else if (!sessionId) {
      // Only clear if there's no sessionId
      historyLoader.clearHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath, encodedProjectName, sessionId]);

  return historyLoader;
}
