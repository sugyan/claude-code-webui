/**
 * Network recovery hook
 * Handles network error detection and automatic recovery with exponential backoff
 */

import { useCallback, useRef, useState } from "react";
import type { StreamResponse, StatusResponse, ResumeResponse } from "../types";

interface NetworkRecoveryOptions {
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  onNetworkError?: () => void;
  onRecoveryStart?: () => void;
  onRecoverySuccess?: () => void;
  onRecoveryFailed?: () => void;
}

interface NetworkRecoveryState {
  isRecovering: boolean;
  retryCount: number;
  lastError: Error | null;
}

export function useNetworkRecovery(options: NetworkRecoveryOptions = {}) {
  const {
    maxRetries = 5,
    initialRetryDelay = 1000,
    maxRetryDelay = 30000,
    onNetworkError,
    onRecoveryStart,
    onRecoverySuccess,
    onRecoveryFailed,
  } = options;

  const [state, setState] = useState<NetworkRecoveryState>({
    isRecovering: false,
    retryCount: 0,
    lastError: null,
  });

  const retryTimeoutRef = useRef<number | null>(null);
  const messageIndexRef = useRef<number>(0);
  const messageHistoryRef = useRef<Array<{ id: number; message: string }>>([]);

  /**
   * Check if an error is a network error
   */
  const isNetworkError = useCallback((error: unknown): boolean => {
    if (error instanceof TypeError) {
      // Common network error messages
      const networkErrorMessages = [
        "Failed to fetch",
        "NetworkError",
        "Network request failed",
        "ERR_INTERNET_DISCONNECTED",
        "ERR_NETWORK_CHANGED",
      ];
      return networkErrorMessages.some((msg) => error.message.includes(msg));
    }
    return false;
  }, []);

  /**
   * Calculate retry delay with exponential backoff
   */
  const calculateRetryDelay = useCallback(
    (retryCount: number): number => {
      const delay = Math.min(
        initialRetryDelay * Math.pow(2, retryCount),
        maxRetryDelay,
      );
      // Add jitter to prevent thundering herd
      return delay + Math.random() * 1000;
    },
    [initialRetryDelay, maxRetryDelay],
  );

  /**
   * Check request status
   */
  const checkRequestStatus = useCallback(
    async (requestId: string): Promise<StatusResponse> => {
      const response = await fetch(`/api/status/${requestId}`);
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }
      return response.json();
    },
    [],
  );

  /**
   * Resume streaming from a specific message index
   */
  const resumeStreaming = useCallback(
    async (requestId: string, fromIndex: number): Promise<ResumeResponse> => {
      const response = await fetch(
        `/api/resume/${requestId}?fromIndex=${fromIndex}`,
      );
      if (!response.ok) {
        throw new Error(`Resume failed: ${response.status}`);
      }
      return response.json();
    },
    [],
  );

  /**
   * Track processed messages
   */
  const trackMessage = useCallback((message: string) => {
    const id = messageIndexRef.current++;
    messageHistoryRef.current.push({ id, message });
    // Optional: limit history size
    if (messageHistoryRef.current.length > 100) {
      messageHistoryRef.current.shift();
    }
    return id; // Return the message ID for reference
  }, []);

  /**
   * Reset message tracking
   */
  const resetTracking = useCallback(() => {
    messageIndexRef.current = 0;
  }, []);

  /**
   * Handle network error and attempt recovery
   */
  const handleNetworkError = useCallback(
    async (
      error: unknown,
      requestId: string,
      onResumeMessages: (messages: StreamResponse[]) => void,
    ): Promise<boolean> => {
      if (!isNetworkError(error)) {
        return false;
      }

      setState((prev) => ({
        ...prev,
        lastError: error as Error,
      }));

      onNetworkError?.();

      // Clear any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      // Attempt recovery with exponential backoff
      let retryCount = 0;

      const attemptRecovery = async (): Promise<boolean> => {
        if (retryCount >= maxRetries) {
          setState((prev) => ({
            ...prev,
            isRecovering: false,
            retryCount: 0,
          }));
          onRecoveryFailed?.();
          return false;
        }

        setState((prev) => ({
          ...prev,
          isRecovering: true,
          retryCount: retryCount + 1,
        }));

        if (retryCount === 0) {
          onRecoveryStart?.();
        }

        try {
          // Check if request is still in progress or completed
          const status = await checkRequestStatus(requestId);

          if (status.status === "not_found") {
            // Request was lost, cannot recover
            throw new Error("Request not found");
          }

          // Resume from last processed message
          const resumeResponse = await resumeStreaming(
            requestId,
            messageIndexRef.current,
          );

          // Process resumed messages
          if (resumeResponse.messages.length > 0) {
            onResumeMessages(resumeResponse.messages);
          }

          setState((prev) => ({
            ...prev,
            isRecovering: false,
            retryCount: 0,
            lastError: null,
          }));

          onRecoverySuccess?.();
          return true;
        } catch (recoveryError) {
          if (!isNetworkError(recoveryError)) {
            // Non-network error, stop retrying
            setState((prev) => ({
              ...prev,
              isRecovering: false,
              retryCount: 0,
            }));
            onRecoveryFailed?.();
            return false;
          }

          // Network still down, retry with backoff
          retryCount++;
          const delay = calculateRetryDelay(retryCount);

          return new Promise((resolve) => {
            retryTimeoutRef.current = window.setTimeout(async () => {
              const success = await attemptRecovery();
              resolve(success);
            }, delay);
          });
        }
      };

      return attemptRecovery();
    },
    [
      isNetworkError,
      maxRetries,
      onNetworkError,
      onRecoveryStart,
      onRecoverySuccess,
      onRecoveryFailed,
      checkRequestStatus,
      resumeStreaming,
      calculateRetryDelay,
    ],
  );

  /**
   * Cleanup function
   */
  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    resetTracking();
  }, [resetTracking]);

  return {
    ...state,
    trackMessage,
    resetTracking,
    handleNetworkError,
    cleanup,
  };
}
