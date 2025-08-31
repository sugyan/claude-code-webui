import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStreamParser } from "./useStreamParser";
import type { StreamingContext } from "./useMessageProcessor";
import type { SDKMessage } from "../../types";
import { generateId } from "../../utils/id";

// Mock dependencies

describe("useStreamParser", () => {
  let mockContext: StreamingContext;

  beforeEach(() => {
    mockContext = {
      addMessage: vi.fn(),
      updateLastMessage: vi.fn(),
      setCurrentAssistantMessage: vi.fn(),
      currentAssistantMessage: null,
      onSessionId: vi.fn(),
      hasReceivedInit: false,
      setHasReceivedInit: vi.fn(),
      shouldShowInitMessage: vi.fn(() => true),
      onInitMessageShown: vi.fn(),
    };

    vi.clearAllMocks();
  });

  describe("ExitPlanMode Detection and Plan Message Creation", () => {
    it("should detect ExitPlanMode tool use and create plan message", () => {
      const { result } = renderHook(() => useStreamParser());

      const assistantMessage: Extract<SDKMessage, { type: "assistant" }> = {
        type: "assistant",
        session_id: "test-session",
        uuid: generateId(),
        parent_tool_use_id: null,
        message: {
          content: [
            {
              type: "tool_use",
              id: "plan-123",
              name: "ExitPlanMode",
              input: {
                plan: "Let's implement a new feature:\n\n1. Add UI component\n2. Connect to API\n3. Write tests",
              },
            },
          ],
        },
      };

      result.current.processStreamLine(
        JSON.stringify({
          type: "claude_json",
          data: assistantMessage,
        }),
        mockContext,
      );

      expect(mockContext.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "plan",
          plan: "Let's implement a new feature:\n\n1. Add UI component\n2. Connect to API\n3. Write tests",
          toolUseId: "plan-123",
          timestamp: expect.any(Number),
        }),
      );
    });

    it("should handle ExitPlanMode with empty plan content", () => {
      const { result } = renderHook(() => useStreamParser());

      const assistantMessage: Extract<SDKMessage, { type: "assistant" }> = {
        type: "assistant",
        session_id: "test-session",
        uuid: generateId(),
        parent_tool_use_id: null,
        message: {
          content: [
            {
              type: "tool_use",
              id: "plan-456",
              name: "ExitPlanMode",
              input: {},
            },
          ],
        },
      };

      result.current.processStreamLine(
        JSON.stringify({
          type: "claude_json",
          data: assistantMessage,
        }),
        mockContext,
      );

      expect(mockContext.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "plan",
          plan: "",
          toolUseId: "plan-456",
          timestamp: expect.any(Number),
        }),
      );
    });

    it("should handle ExitPlanMode with missing input field", () => {
      const { result } = renderHook(() => useStreamParser());

      const assistantMessage: Extract<SDKMessage, { type: "assistant" }> = {
        type: "assistant",
        session_id: "test-session",
        uuid: generateId(),
        parent_tool_use_id: null,
        message: {
          content: [
            {
              type: "tool_use",
              id: "plan-789",
              name: "ExitPlanMode",
              // input field is intentionally missing
            },
          ],
        },
      };

      result.current.processStreamLine(
        JSON.stringify({
          type: "claude_json",
          data: assistantMessage,
        }),
        mockContext,
      );

      expect(mockContext.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "plan",
          plan: "",
          toolUseId: "plan-789",
          timestamp: expect.any(Number),
        }),
      );
    });

    it("should handle ExitPlanMode with missing toolUseId", () => {
      const { result } = renderHook(() => useStreamParser());

      const assistantMessage: Extract<SDKMessage, { type: "assistant" }> = {
        type: "assistant",
        session_id: "test-session",
        uuid: generateId(),
        parent_tool_use_id: null,
        message: {
          content: [
            {
              type: "tool_use",
              // id field is intentionally missing
              name: "ExitPlanMode",
              input: {
                plan: "Test plan content",
              },
            },
          ],
        },
      };

      result.current.processStreamLine(
        JSON.stringify({
          type: "claude_json",
          data: assistantMessage,
        }),
        mockContext,
      );

      expect(mockContext.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "plan",
          plan: "Test plan content",
          toolUseId: "",
          timestamp: expect.any(Number),
        }),
      );
    });

    it("should handle non-string plan content gracefully", () => {
      const { result } = renderHook(() => useStreamParser());

      const assistantMessage: Extract<SDKMessage, { type: "assistant" }> = {
        type: "assistant",
        session_id: "test-session",
        uuid: generateId(),
        parent_tool_use_id: null,
        message: {
          content: [
            {
              type: "tool_use",
              id: "plan-invalid",
              name: "ExitPlanMode",
              input: {
                plan: { invalid: "object" }, // Non-string content
              },
            },
          ],
        },
      };

      result.current.processStreamLine(
        JSON.stringify({
          type: "claude_json",
          data: assistantMessage,
        }),
        mockContext,
      );

      expect(mockContext.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "plan",
          plan: { invalid: "object" },
          toolUseId: "plan-invalid",
          timestamp: expect.any(Number),
        }),
      );
    });

    it("should not create plan message for non-ExitPlanMode tools", () => {
      const { result } = renderHook(() => useStreamParser());

      const assistantMessage: Extract<SDKMessage, { type: "assistant" }> = {
        type: "assistant",
        session_id: "test-session",
        uuid: generateId(),
        parent_tool_use_id: null,
        message: {
          content: [
            {
              type: "tool_use",
              id: "bash-123",
              name: "Bash",
              input: {
                command: "ls -la",
              },
            },
          ],
        },
      };

      result.current.processStreamLine(
        JSON.stringify({
          type: "claude_json",
          data: assistantMessage,
        }),
        mockContext,
      );

      // Should create a regular tool message, not a plan message
      expect(mockContext.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
        }),
      );

      // Verify it's not a plan message
      const addedMessage = (
        mockContext.addMessage as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls[0][0] as { type: string };
      expect(addedMessage.type).not.toBe("plan");
    });
  });

  describe("Stream Line Processing and Error Handling", () => {
    it("should handle malformed JSON gracefully", () => {
      const { result } = renderHook(() => useStreamParser());
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      result.current.processStreamLine("invalid json", mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to parse stream line:",
        expect.any(Error),
      );
      expect(mockContext.addMessage).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle missing data field in claude_json", () => {
      const { result } = renderHook(() => useStreamParser());

      result.current.processStreamLine(
        JSON.stringify({
          type: "claude_json",
          // data field is missing
        }),
        mockContext,
      );

      expect(mockContext.addMessage).not.toHaveBeenCalled();
    });

    it("should handle error stream responses", () => {
      const { result } = renderHook(() => useStreamParser());

      result.current.processStreamLine(
        JSON.stringify({
          type: "error",
          error: "Claude execution failed",
        }),
        mockContext,
      );

      expect(mockContext.addMessage).toHaveBeenCalledWith({
        type: "error",
        subtype: "stream_error",
        message: "Claude execution failed",
        timestamp: expect.any(Number),
      });
    });

    it("should handle error stream responses with missing error message", () => {
      const { result } = renderHook(() => useStreamParser());

      result.current.processStreamLine(
        JSON.stringify({
          type: "error",
          // error field is missing
        }),
        mockContext,
      );

      expect(mockContext.addMessage).toHaveBeenCalledWith({
        type: "error",
        subtype: "stream_error",
        message: "Unknown error",
        timestamp: expect.any(Number),
      });
    });

    it("should handle aborted stream responses", () => {
      const { result } = renderHook(() => useStreamParser());

      result.current.processStreamLine(
        JSON.stringify({
          type: "aborted",
        }),
        mockContext,
      );

      expect(mockContext.addMessage).toHaveBeenCalledWith({
        type: "system",
        subtype: "abort",
        message: "Operation was aborted by user",
        timestamp: expect.any(Number),
      });
      expect(mockContext.setCurrentAssistantMessage).toHaveBeenCalledWith(null);
    });
  });

  describe("Mixed Content Handling", () => {
    it("should handle assistant message with both text and ExitPlanMode tool use", () => {
      const { result } = renderHook(() => useStreamParser());

      const assistantMessage: Extract<SDKMessage, { type: "assistant" }> = {
        type: "assistant",
        session_id: "test-session",
        uuid: generateId(),
        parent_tool_use_id: null,
        message: {
          content: [
            {
              type: "text",
              text: "I'll help you with that. Here's my plan:",
            },
            {
              type: "tool_use",
              id: "plan-mixed",
              name: "ExitPlanMode",
              input: {
                plan: "1. Analyze requirements\n2. Design solution\n3. Implement",
              },
            },
          ],
        },
      };

      result.current.processStreamLine(
        JSON.stringify({
          type: "claude_json",
          data: assistantMessage,
        }),
        mockContext,
      );

      // Should create/update assistant text message and add plan message
      expect(mockContext.addMessage).toHaveBeenCalledTimes(2);
      expect(mockContext.updateLastMessage).toHaveBeenCalledWith(
        "I'll help you with that. Here's my plan:",
      );
      expect(mockContext.addMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: "plan",
          plan: "1. Analyze requirements\n2. Design solution\n3. Implement",
          toolUseId: "plan-mixed",
        }),
      );
    });

    it("should handle multiple tool uses including ExitPlanMode", () => {
      const { result } = renderHook(() => useStreamParser());

      const assistantMessage: Extract<SDKMessage, { type: "assistant" }> = {
        type: "assistant",
        session_id: "test-session",
        uuid: generateId(),
        parent_tool_use_id: null,
        message: {
          content: [
            {
              type: "tool_use",
              id: "bash-123",
              name: "Bash",
              input: { command: "ls" },
            },
            {
              type: "tool_use",
              id: "plan-multi",
              name: "ExitPlanMode",
              input: { plan: "Multi-tool plan" },
            },
          ],
        },
      };

      result.current.processStreamLine(
        JSON.stringify({
          type: "claude_json",
          data: assistantMessage,
        }),
        mockContext,
      );

      expect(mockContext.addMessage).toHaveBeenCalledTimes(2);

      // First call should be the regular tool
      expect(mockContext.addMessage).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          timestamp: expect.any(Number),
        }),
      );

      // Second call should be the plan
      expect(mockContext.addMessage).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: "plan",
          plan: "Multi-tool plan",
          toolUseId: "plan-multi",
        }),
      );
    });
  });

  describe("Session ID Handling with Plan Mode", () => {
    it("should update session ID when processing assistant message with ExitPlanMode", () => {
      const { result } = renderHook(() => useStreamParser());
      mockContext.hasReceivedInit = true;

      const assistantMessage: Extract<SDKMessage, { type: "assistant" }> = {
        type: "assistant",
        session_id: "session-with-plan",
        uuid: generateId(),
        parent_tool_use_id: null,
        message: {
          content: [
            {
              type: "tool_use",
              id: "plan-session",
              name: "ExitPlanMode",
              input: { plan: "Plan with session tracking" },
            },
          ],
        },
      };

      result.current.processStreamLine(
        JSON.stringify({
          type: "claude_json",
          data: assistantMessage,
        }),
        mockContext,
      );

      expect(mockContext.onSessionId).toHaveBeenCalledWith("session-with-plan");
      expect(mockContext.addMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "plan",
          plan: "Plan with session tracking",
        }),
      );
    });
  });
});
