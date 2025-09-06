import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Context } from "hono";
import { handleChatRequest } from "./chat";
import type { ChatRequest } from "../../shared/types";
import { query } from "@anthropic-ai/claude-code";

// Define minimal mock types for Claude Code SDK to maintain type safety in tests
type MockClaudeCode = {
  query: typeof vi.fn;
};

vi.mock(
  "@anthropic-ai/claude-code",
  (): MockClaudeCode => ({
    query: vi.fn(),
  }),
);

// Mock logger
vi.mock("../utils/logger", () => ({
  logger: {
    chat: {
      debug: vi.fn(),
      error: vi.fn(),
    },
  },
}));

const mockQuery = vi.mocked(query);

describe("Chat Handler - Permission Mode Tests", () => {
  let mockContext: Context;
  let requestAbortControllers: Map<string, AbortController>;

  beforeEach(() => {
    requestAbortControllers = new Map();

    // Create mock context
    mockContext = {
      req: {
        json: vi.fn(),
      },
      var: {
        config: {
          cliPath: "/path/to/claude-cli",
        },
      },
    } as any;

    vi.clearAllMocks();
  });

  afterEach(() => {
    requestAbortControllers.clear();
  });

  describe("Permission Mode Parameter Handling", () => {
    it("should pass permissionMode 'plan' to Claude SDK", async () => {
      const chatRequest: ChatRequest = {
        message: "Test message",
        requestId: "test-123",
        permissionMode: "plan",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      // Mock SDK to return simple message and complete
      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      const response = await handleChatRequest(
        mockContext,
        requestAbortControllers,
      );

      expect(mockQuery).toHaveBeenCalledWith({
        prompt: "Test message",
        options: expect.objectContaining({
          permissionMode: "plan",
          abortController: expect.any(AbortController),
          executable: "node",
          executableArgs: [],
          pathToClaudeCodeExecutable: "/path/to/claude-cli",
        }),
      });

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("Content-Type")).toBe("application/x-ndjson");
    });

    it("should pass permissionMode 'acceptEdits' to Claude SDK", async () => {
      const chatRequest: ChatRequest = {
        message: "Test message",
        requestId: "test-456",
        permissionMode: "acceptEdits",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      await handleChatRequest(mockContext, requestAbortControllers);

      expect(mockQuery).toHaveBeenCalledWith({
        prompt: "Test message",
        options: expect.objectContaining({
          permissionMode: "acceptEdits",
        }),
      });
    });

    it("should pass permissionMode 'default' to Claude SDK", async () => {
      const chatRequest: ChatRequest = {
        message: "Test message",
        requestId: "test-789",
        permissionMode: "default",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      await handleChatRequest(mockContext, requestAbortControllers);

      expect(mockQuery).toHaveBeenCalledWith({
        prompt: "Test message",
        options: expect.objectContaining({
          permissionMode: "default",
        }),
      });
    });

    it("should not include permissionMode in options when undefined", async () => {
      const chatRequest: ChatRequest = {
        message: "Test message",
        requestId: "test-undefined",
        // permissionMode is undefined
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      await handleChatRequest(mockContext, requestAbortControllers);

      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall.options).not.toHaveProperty("permissionMode");
    });

    it("should handle permissionMode alongside other parameters", async () => {
      const chatRequest: ChatRequest = {
        message: "Test message with all params",
        requestId: "test-all-params",
        sessionId: "session-123",
        allowedTools: ["Bash", "Edit"],
        workingDirectory: "/project/path",
        permissionMode: "plan",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      await handleChatRequest(mockContext, requestAbortControllers);

      expect(mockQuery).toHaveBeenCalledWith({
        prompt: "Test message with all params",
        options: expect.objectContaining({
          permissionMode: "plan",
          resume: "session-123",
          allowedTools: ["Bash", "Edit"],
          cwd: "/project/path",
          abortController: expect.any(AbortController),
          executable: "node",
          executableArgs: [],
          pathToClaudeCodeExecutable: "/path/to/claude-cli",
        }),
      });
    });
  });

  describe("Message Processing with Permission Mode", () => {
    it("should process slash commands with permissionMode", async () => {
      const chatRequest: ChatRequest = {
        message: "/help",
        requestId: "test-slash",
        permissionMode: "plan",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Help response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      await handleChatRequest(mockContext, requestAbortControllers);

      // Should strip the slash and pass "help" to SDK
      expect(mockQuery).toHaveBeenCalledWith({
        prompt: "help",
        options: expect.objectContaining({
          permissionMode: "plan",
        }),
      });
    });

    it("should handle regular messages with permissionMode", async () => {
      const chatRequest: ChatRequest = {
        message: "Regular message",
        requestId: "test-regular",
        permissionMode: "acceptEdits",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Regular response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      await handleChatRequest(mockContext, requestAbortControllers);

      expect(mockQuery).toHaveBeenCalledWith({
        prompt: "Regular message",
        options: expect.objectContaining({
          permissionMode: "acceptEdits",
        }),
      });
    });
  });

  describe("Stream Response Generation", () => {
    it("should yield SDK messages with permissionMode context", async () => {
      const chatRequest: ChatRequest = {
        message: "Test streaming",
        requestId: "test-stream",
        permissionMode: "plan",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      const mockMessages = [
        {
          type: "system",
          subtype: "init",
          cwd: "/test",
          tools: [],
          session_id: "test",
          apiKeySource: "env",
          mcp_servers: {},
          model: "test",
          is_resuming: false,
        } as any,
        {
          type: "assistant",
          message: { content: [{ type: "text", text: "Streaming response" }] },
          session_id: "test",
          parent_tool_use_id: null,
        } as any,
        {
          type: "result",
          subtype: "success",
          usage: { input_tokens: 10, output_tokens: 5 },
          session_id: "test",
        } as any,
      ];

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const message of mockMessages) {
            yield message;
          }
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      const response = await handleChatRequest(
        mockContext,
        requestAbortControllers,
      );
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      let allChunks = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        allChunks += decoder.decode(value);
      }

      const lines = allChunks.trim().split("\n");
      expect(lines).toHaveLength(4); // 3 SDK messages + 1 done message

      // Parse each line to verify structure
      const parsedLines = lines.map((line) => JSON.parse(line));

      expect(parsedLines[0]).toEqual({
        type: "claude_json",
        data: mockMessages[0],
      });

      expect(parsedLines[1]).toEqual({
        type: "claude_json",
        data: mockMessages[1],
      });

      expect(parsedLines[2]).toEqual({
        type: "claude_json",
        data: mockMessages[2],
      });

      expect(parsedLines[3]).toEqual({
        type: "done",
      });
    });
  });

  describe("Error Handling with Permission Mode", () => {
    it("should handle SDK errors when using permissionMode", async () => {
      const chatRequest: ChatRequest = {
        message: "Error test",
        requestId: "test-error",
        permissionMode: "plan",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          throw new Error("SDK execution failed");
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      const response = await handleChatRequest(
        mockContext,
        requestAbortControllers,
      );
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      let allChunks = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        allChunks += decoder.decode(value);
      }

      const lines = allChunks.trim().split("\n");
      expect(lines).toHaveLength(1);

      const errorResponse = JSON.parse(lines[0]);
      expect(errorResponse).toEqual({
        type: "error",
        error: "SDK execution failed",
      });
    });

    // TODO: Re-enable when AbortError is properly exported from Claude SDK
    it.skip("should handle abort errors when using permissionMode", async () => {
      // Test currently skipped because AbortError is not exported from Claude SDK
      // When AbortError becomes available, update this test accordingly
      const chatRequest: ChatRequest = {
        message: "Abort test",
        requestId: "test-abort",
        permissionMode: "acceptEdits",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          throw new Error("Operation aborted");
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      const response = await handleChatRequest(
        mockContext,
        requestAbortControllers,
      );
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      let allChunks = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        allChunks += decoder.decode(value);
      }

      const lines = allChunks.trim().split("\n");
      expect(lines).toHaveLength(1);

      const errorResponse = JSON.parse(lines[0]);
      expect(errorResponse).toEqual({
        type: "error",
        error: "Operation aborted",
      });
    });
  });

  describe("Abort Controller Management with Permission Mode", () => {
    it("should manage abort controller correctly with permissionMode", async () => {
      const chatRequest: ChatRequest = {
        message: "Controller test",
        requestId: "test-controller",
        permissionMode: "plan",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      expect(requestAbortControllers.size).toBe(0);

      const response = await handleChatRequest(
        mockContext,
        requestAbortControllers,
      );

      // Read the response to ensure the generator completes
      const reader = response.body!.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }

      // Controller should be cleaned up after completion
      expect(requestAbortControllers.size).toBe(0);
    });

    it("should store and retrieve abort controller during execution", async () => {
      const chatRequest: ChatRequest = {
        message: "Controller tracking",
        requestId: "test-tracking",
        permissionMode: "acceptEdits",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      let capturedController: AbortController | null = null;

      mockQuery.mockImplementation(
        (args: any) =>
          ({
            [Symbol.asyncIterator]: async function* () {
              capturedController = args.options.abortController;
              expect(requestAbortControllers.has("test-tracking")).toBe(true);
              yield {
                type: "assistant",
                message: { content: [{ type: "text", text: "Response" }] },
                session_id: "test-session",
                parent_tool_use_id: null,
              } as any;
            },
            interrupt: vi.fn(),
            next: vi.fn(),
            return: vi.fn(),
            throw: vi.fn(),
          }) as any,
      );

      await handleChatRequest(mockContext, requestAbortControllers);

      expect(capturedController).toBeInstanceOf(AbortController);
    });
  });
});
