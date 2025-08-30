import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useClaudeStreaming } from "./useClaudeStreaming";
import type { SDKMessage } from "../types";
import { generateId } from "../utils/id";

describe("useClaudeStreaming", () => {
  it("does not extract session_id from system messages", () => {
    const { result } = renderHook(() => useClaudeStreaming());
    const onSessionId = vi.fn();

    const mockContext = {
      currentAssistantMessage: null,
      setCurrentAssistantMessage: vi.fn(),
      addMessage: vi.fn(),
      updateLastMessage: vi.fn(),
      onSessionId,
      hasReceivedInit: false,
      setHasReceivedInit: vi.fn(),
    };

    const systemMessage: SDKMessage = {
      type: "system",
      subtype: "init",
      apiKeySource: "user" as const,
      cwd: "/test",
      session_id: "test-session-123",
      uuid: generateId(),
      tools: ["Bash"],
      mcp_servers: [],
      model: "claude-3-sonnet",
      permissionMode: "default" as const,
      slash_commands: [],
      output_style: "default",
    };

    const streamLine = JSON.stringify({
      type: "claude_json",
      data: systemMessage,
    });

    result.current.processStreamLine(streamLine, mockContext);

    // sessionId should NOT be extracted from system messages
    expect(onSessionId).not.toHaveBeenCalled();
    expect(mockContext.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "system",
        subtype: "init",
        session_id: "test-session-123",
        uuid: expect.any(String),
        timestamp: expect.any(Number),
      }),
    );
    // But hasReceivedInit should be set to true for init messages
    expect(mockContext.setHasReceivedInit).toHaveBeenCalledWith(true);
  });

  it("extracts session_id from assistant messages when hasReceivedInit is true", () => {
    const { result } = renderHook(() => useClaudeStreaming());
    const onSessionId = vi.fn();

    const mockContext = {
      currentAssistantMessage: null,
      setCurrentAssistantMessage: vi.fn(),
      addMessage: vi.fn(),
      updateLastMessage: vi.fn(),
      onSessionId,
      hasReceivedInit: true, // This is key - init has been received
    };

    const assistantMessage: SDKMessage = {
      type: "assistant",
      message: {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Hello world" }],
        model: "claude-3-sonnet",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 5 },
      },
      parent_tool_use_id: null,
      session_id: "test-session-456",
      uuid: generateId(),
    };

    const streamLine = JSON.stringify({
      type: "claude_json",
      data: assistantMessage,
    });

    result.current.processStreamLine(streamLine, mockContext);

    expect(onSessionId).toHaveBeenCalledWith("test-session-456");
  });

  it("does not extract session_id from assistant messages when hasReceivedInit is false", () => {
    const { result } = renderHook(() => useClaudeStreaming());
    const onSessionId = vi.fn();

    const mockContext = {
      currentAssistantMessage: null,
      setCurrentAssistantMessage: vi.fn(),
      addMessage: vi.fn(),
      updateLastMessage: vi.fn(),
      onSessionId,
      hasReceivedInit: false, // Init has NOT been received
    };

    const assistantMessage: SDKMessage = {
      type: "assistant",
      message: {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Hello world" }],
        model: "claude-3-sonnet",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 5 },
      },
      parent_tool_use_id: null,
      session_id: "test-session-456",
      uuid: generateId(),
    };

    const streamLine = JSON.stringify({
      type: "claude_json",
      data: assistantMessage,
    });

    result.current.processStreamLine(streamLine, mockContext);

    // sessionId should NOT be extracted when hasReceivedInit is false
    expect(onSessionId).not.toHaveBeenCalled();
  });

  it("does not extract session_id from result messages", () => {
    const { result } = renderHook(() => useClaudeStreaming());
    const onSessionId = vi.fn();

    const mockContext = {
      currentAssistantMessage: null,
      setCurrentAssistantMessage: vi.fn(),
      addMessage: vi.fn(),
      updateLastMessage: vi.fn(),
      onSessionId,
    };

    const resultMessage: SDKMessage = {
      type: "result",
      subtype: "success",
      duration_ms: 1000,
      duration_api_ms: 800,
      is_error: false,
      num_turns: 1,
      result: "Task completed",
      session_id: "test-session-789",
      uuid: generateId(),
      total_cost_usd: 0.001,
      usage: { input_tokens: 10, output_tokens: 5 },
      permission_denials: [],
    };

    const streamLine = JSON.stringify({
      type: "claude_json",
      data: resultMessage,
    });

    result.current.processStreamLine(streamLine, mockContext);

    // sessionId should NOT be extracted from result messages
    expect(onSessionId).not.toHaveBeenCalled();
  });

  it("handles missing onSessionId callback gracefully", () => {
    const { result } = renderHook(() => useClaudeStreaming());

    const mockContext = {
      currentAssistantMessage: null,
      setCurrentAssistantMessage: vi.fn(),
      addMessage: vi.fn(),
      updateLastMessage: vi.fn(),
      hasReceivedInit: false,
      setHasReceivedInit: vi.fn(),
      // onSessionId is missing
    };

    const systemMessage: SDKMessage = {
      type: "system",
      subtype: "init",
      apiKeySource: "user" as const,
      cwd: "/test",
      session_id: "test-session-123",
      uuid: generateId(),
      tools: ["Bash"],
      mcp_servers: [],
      model: "claude-3-sonnet",
      permissionMode: "default" as const,
      slash_commands: [],
      output_style: "default",
    };

    const streamLine = JSON.stringify({
      type: "claude_json",
      data: systemMessage,
    });

    // Should not throw when onSessionId is missing
    expect(() => {
      result.current.processStreamLine(streamLine, mockContext);
    }).not.toThrow();
  });

  it("handles tool_use messages with simplified format", () => {
    const { result } = renderHook(() => useClaudeStreaming());

    const mockContext = {
      currentAssistantMessage: null,
      setCurrentAssistantMessage: vi.fn(),
      addMessage: vi.fn(),
      updateLastMessage: vi.fn(),
    };

    const assistantMessage: SDKMessage = {
      type: "assistant",
      message: {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "tool_123",
            name: "LS",
            input: { path: "/home/user/documents" },
          },
        ],
        model: "claude-3-sonnet",
        stop_reason: "tool_use",
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 5 },
      },
      parent_tool_use_id: null,
      session_id: "test-session-123",
      uuid: generateId(),
    };

    const streamLine = JSON.stringify({
      type: "claude_json",
      data: assistantMessage,
    });

    result.current.processStreamLine(streamLine, mockContext);

    expect(mockContext.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "tool",
        content: "LS(/home/user/documents)",
        timestamp: expect.any(Number),
      }),
    );
  });

  it("handles user messages with tool_result content", () => {
    const { result } = renderHook(() => useClaudeStreaming());

    const mockContext = {
      currentAssistantMessage: null,
      setCurrentAssistantMessage: vi.fn(),
      addMessage: vi.fn(),
      updateLastMessage: vi.fn(),
    };

    const userMessage: SDKMessage = {
      type: "user",
      message: {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "tool_123",
            content: "file1.txt\nfile2.txt\nfile3.txt",
          },
        ],
      },
      parent_tool_use_id: null,
      session_id: "test-session-123",
      uuid: generateId(),
    };

    const streamLine = JSON.stringify({
      type: "claude_json",
      data: userMessage,
    });

    result.current.processStreamLine(streamLine, mockContext);

    expect(mockContext.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "tool_result",
        toolName: "Tool",
        content: "file1.txt\nfile2.txt\nfile3.txt",
        summary: "3 lines",
        timestamp: expect.any(Number),
      }),
    );
  });

  it("handles tool_use messages with different argument types", () => {
    const { result } = renderHook(() => useClaudeStreaming());

    const mockContext = {
      currentAssistantMessage: null,
      setCurrentAssistantMessage: vi.fn(),
      addMessage: vi.fn(),
      updateLastMessage: vi.fn(),
    };

    const assistantMessage: SDKMessage = {
      type: "assistant",
      message: {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "tool_123",
            name: "Bash",
            input: { command: "ls -la" },
          },
        ],
        model: "claude-3-sonnet",
        stop_reason: "tool_use",
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 5 },
      },
      parent_tool_use_id: null,
      session_id: "test-session-123",
      uuid: generateId(),
    };

    const streamLine = JSON.stringify({
      type: "claude_json",
      data: assistantMessage,
    });

    result.current.processStreamLine(streamLine, mockContext);

    expect(mockContext.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "tool",
        content: "Bash(ls -la)",
        timestamp: expect.any(Number),
      }),
    );
  });
});
