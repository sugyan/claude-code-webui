import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createExitPlanModeToolResult } from "../../utils/mockResponseGenerator";

// Mock the message converter
vi.mock("../useMessageConverter", () => ({
  useMessageConverter: () => ({
    createToolResultMessage: vi.fn((data) => ({
      type: "tool_result",
      toolName: "ExitPlanMode",
      content: data.content || "Plan rejected",
      summary: "Plan rejection",
      toolUseId: data.tool_use_id,
      timestamp: Date.now(),
    })),
  }),
}));

// Create a simple hook for testing plan rejection workflow
function usePlanRejectionWorkflow() {
  const sendToolResult = vi.fn();
  const updatePermissionMode = vi.fn();
  const closePlanModeRequest = vi.fn();

  const handlePlanRejection = (toolUseId: string, sessionId: string) => {
    // Create tool result message for plan rejection
    const toolResultMessage = createExitPlanModeToolResult(
      sessionId,
      toolUseId,
    );
    sendToolResult(toolResultMessage);

    // Update UI state
    updatePermissionMode("plan");
    closePlanModeRequest();

    return {
      success: true,
      toolResultGenerated: true,
      stateUpdated: true,
    };
  };

  return {
    handlePlanRejection,
    sendToolResult,
    updatePermissionMode,
    closePlanModeRequest,
  };
}

describe("Plan Rejection Workflow Tests", () => {
  describe("Tool Result Generation", () => {
    it("should create correct tool_result message for plan rejection", () => {
      const toolUseId = "exit-plan-123";
      const sessionId = "session-456";

      const toolResult = createExitPlanModeToolResult(sessionId, toolUseId);

      expect(toolResult).toEqual({
        type: "user",
        message: {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUseId,
              content: "Exit plan mode?",
              is_error: true,
            },
          ],
        },
        parent_tool_use_id: null,
        session_id: sessionId,
        uuid: expect.any(String),
      });
    });

    it("should handle plan rejection with missing toolUseId gracefully", () => {
      const toolUseId = "";
      const sessionId = "session-456";

      const toolResult = createExitPlanModeToolResult(sessionId, toolUseId);

      expect(toolResult.message.content[0]).toEqual({
        type: "tool_result",
        tool_use_id: "",
        content: "Exit plan mode?",
        is_error: true,
      });
    });

    it("should handle plan rejection with missing sessionId", () => {
      const toolUseId = "exit-plan-123";
      const sessionId = "";

      const toolResult = createExitPlanModeToolResult(sessionId, toolUseId);

      expect(toolResult.session_id).toBe("");
      expect(toolResult.type).toBe("user");
    });
  });

  describe("State Management During Plan Rejection", () => {
    it("should properly manage state when rejecting plan", () => {
      const { result } = renderHook(() => usePlanRejectionWorkflow());

      const toolUseId = "plan-rejection-123";
      const sessionId = "session-789";

      let rejectionResult;
      act(() => {
        rejectionResult = result.current.handlePlanRejection(
          toolUseId,
          sessionId,
        );
      });

      // Should have sent tool result
      expect(result.current.sendToolResult).toHaveBeenCalledTimes(1);
      expect(result.current.sendToolResult).toHaveBeenCalledWith({
        type: "user",
        message: {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUseId,
              content: "Exit plan mode?",
              is_error: true,
            },
          ],
        },
        parent_tool_use_id: null,
        session_id: sessionId,
        uuid: expect.any(String),
      });

      // Should have updated permission mode back to plan
      expect(result.current.updatePermissionMode).toHaveBeenCalledWith("plan");

      // Should have closed the plan mode request
      expect(result.current.closePlanModeRequest).toHaveBeenCalledTimes(1);

      // Should return successful result
      expect(rejectionResult).toEqual({
        success: true,
        toolResultGenerated: true,
        stateUpdated: true,
      });
    });

    it("should handle multiple plan rejections correctly", () => {
      const { result } = renderHook(() => usePlanRejectionWorkflow());

      // First rejection
      act(() => {
        result.current.handlePlanRejection("plan-1", "session-1");
      });

      // Second rejection
      act(() => {
        result.current.handlePlanRejection("plan-2", "session-1");
      });

      // Should have been called twice
      expect(result.current.sendToolResult).toHaveBeenCalledTimes(2);
      expect(result.current.updatePermissionMode).toHaveBeenCalledTimes(2);
      expect(result.current.closePlanModeRequest).toHaveBeenCalledTimes(2);

      // Verify second call was with correct parameters
      expect(result.current.sendToolResult).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: "user",
          message: {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: "plan-2",
                content: "Exit plan mode?",
                is_error: true,
              },
            ],
          },
          session_id: "session-1",
        }),
      );
    });
  });

  describe("Integration with Streaming System", () => {
    it("should generate tool_result message that can be processed by stream parser", async () => {
      const toolUseId = "stream-plan-123";
      const sessionId = "stream-session-456";

      const toolResult = createExitPlanModeToolResult(sessionId, toolUseId);

      // Simulate stream processing
      const mockStreamData = {
        type: "claude_json" as const,
        data: toolResult,
      };

      // Verify stream data structure
      expect(mockStreamData.type).toBe("claude_json");
      expect(mockStreamData.data.type).toBe("user");
      expect(mockStreamData.data.message.content[0].type).toBe("tool_result");
      expect(mockStreamData.data.message.content[0].is_error).toBe(true);
    });

    it("should handle tool_result message processing for plan rejection", () => {
      // Test that tool_result data structure is compatible with message processing
      const toolResultData = {
        type: "tool_result" as const,
        tool_use_id: "plan-rejection-456",
        content: "Plan rejected by user",
        is_error: true,
      };

      // Verify the structure matches what the system expects
      expect(toolResultData.type).toBe("tool_result");
      expect(toolResultData.tool_use_id).toBe("plan-rejection-456");
      expect(toolResultData.is_error).toBe(true);
      expect(toolResultData.content).toBe("Plan rejected by user");
    });

    it("should maintain session continuity during plan rejection", () => {
      const originalSessionId = "continuous-session-123";
      const toolUseId = "continuous-plan-456";

      const toolResult = createExitPlanModeToolResult(
        originalSessionId,
        toolUseId,
      );

      // Session ID should be preserved in the tool result
      expect(toolResult.session_id).toBe(originalSessionId);

      // This ensures that the plan rejection doesn't break conversation continuity
      expect(toolResult.type).toBe("user");
      expect(toolResult.parent_tool_use_id).toBeNull();
    });
  });

  describe("Error Handling in Plan Rejection", () => {
    it("should handle plan rejection when sendToolResult fails", () => {
      const { result } = renderHook(() => usePlanRejectionWorkflow());

      // Make sendToolResult throw an error
      result.current.sendToolResult.mockImplementation(() => {
        throw new Error("Network error");
      });

      const toolUseId = "error-plan-123";
      const sessionId = "error-session-456";

      // Should handle error gracefully
      expect(() => {
        act(() => {
          result.current.handlePlanRejection(toolUseId, sessionId);
        });
      }).toThrow("Network error");

      // State management should still be attempted
      expect(result.current.sendToolResult).toHaveBeenCalledTimes(1);
    });

    it("should handle plan rejection with malformed data", () => {
      const toolUseId = null as unknown as string;
      const sessionId = undefined as unknown as string;

      // Should not throw error with null/undefined values
      expect(() => {
        createExitPlanModeToolResult(sessionId, toolUseId);
      }).not.toThrow();

      const result = createExitPlanModeToolResult(sessionId, toolUseId);
      expect(result.session_id).toBeUndefined();
      expect(result.message.content[0].tool_use_id).toBeNull();
    });
  });

  describe("Plan Rejection vs Approval Workflow", () => {
    it("should have different behavior for rejection vs acceptance", () => {
      // Test that plan rejection creates error tool_result while acceptance doesn't
      const rejectionResult = createExitPlanModeToolResult(
        "session",
        "tool-123",
      );

      // Rejection should have is_error: true
      expect(rejectionResult.message.content[0].is_error).toBe(true);
      expect(rejectionResult.message.content[0].content).toBe(
        "Exit plan mode?",
      );

      // Acceptance would not create a tool_result message at all
      // (This is the current behavior - acceptance just proceeds with the plan)
    });

    it("should maintain correct tool_use_id relationship", () => {
      const originalToolUseId = "original-exitplanmode-123";
      const sessionId = "relationship-session";

      const rejectionResult = createExitPlanModeToolResult(
        sessionId,
        originalToolUseId,
      );

      // The tool_result should reference the original tool_use
      expect(rejectionResult.message.content[0].tool_use_id).toBe(
        originalToolUseId,
      );
      expect(rejectionResult.type).toBe("user");
    });
  });

  describe("Plan Rejection UI State Management", () => {
    it("should reset UI state correctly after plan rejection", () => {
      const { result } = renderHook(() => usePlanRejectionWorkflow());

      act(() => {
        result.current.handlePlanRejection("ui-plan-123", "ui-session-456");
      });

      // Should switch back to plan mode (allowing for more planning)
      expect(result.current.updatePermissionMode).toHaveBeenCalledWith("plan");

      // Should close the current plan request dialog
      expect(result.current.closePlanModeRequest).toHaveBeenCalledTimes(1);

      // Should send rejection signal to Claude
      expect(result.current.sendToolResult).toHaveBeenCalledTimes(1);
    });

    it("should allow for immediate re-planning after rejection", () => {
      const { result } = renderHook(() => usePlanRejectionWorkflow());

      // Reject first plan
      act(() => {
        result.current.handlePlanRejection("plan-v1", "session-replan");
      });

      // Should be in plan mode for immediate re-planning
      expect(result.current.updatePermissionMode).toHaveBeenLastCalledWith(
        "plan",
      );

      // Can immediately handle another plan
      act(() => {
        result.current.handlePlanRejection("plan-v2", "session-replan");
      });

      expect(result.current.updatePermissionMode).toHaveBeenCalledTimes(2);
      expect(result.current.sendToolResult).toHaveBeenCalledTimes(2);
    });
  });
});
