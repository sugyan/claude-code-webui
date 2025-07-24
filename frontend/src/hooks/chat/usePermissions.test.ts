import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePermissions } from "./usePermissions";

describe("usePermissions", () => {
  it("should initialize with empty allowed tools", () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.allowedTools).toEqual([]);
    expect(result.current.permissionRequest).toBeNull();
  });

  it("should show permission request", () => {
    const { result } = renderHook(() => usePermissions());

    act(() => {
      result.current.showPermissionRequest("Bash", ["Bash(ls:*)"], "tool-123");
    });

    expect(result.current.permissionRequest).toEqual({
      isOpen: true,
      toolName: "Bash",
      patterns: ["Bash(ls:*)"],
      toolUseId: "tool-123",
    });
  });

  it("should close permission request", () => {
    const { result } = renderHook(() => usePermissions());

    act(() => {
      result.current.showPermissionRequest("Bash", ["Bash(ls:*)"], "tool-123");
    });

    act(() => {
      result.current.closePermissionRequest();
    });

    expect(result.current.permissionRequest).toBeNull();
  });

  it("should allow tool temporarily", () => {
    const { result } = renderHook(() => usePermissions());

    let tempAllowedTools: string[] = [];

    act(() => {
      tempAllowedTools = result.current.allowToolTemporary("Bash(ls:*)");
    });

    expect(tempAllowedTools).toEqual(["Bash(ls:*)"]);
    // Should not update permanent allowed tools
    expect(result.current.allowedTools).toEqual([]);
  });

  it("should allow tool permanently", () => {
    const { result } = renderHook(() => usePermissions());

    let updatedAllowedTools: string[] = [];

    act(() => {
      updatedAllowedTools = result.current.allowToolPermanent("Bash(ls:*)");
    });

    expect(updatedAllowedTools).toEqual(["Bash(ls:*)"]);
    expect(result.current.allowedTools).toEqual(["Bash(ls:*)"]);
  });

  it("should allow multiple tools with base tools parameter", () => {
    const { result } = renderHook(() => usePermissions());

    let updatedAllowedTools: string[] = [];

    // First add one tool permanently
    act(() => {
      updatedAllowedTools = result.current.allowToolPermanent("Bash(ls:*)");
    });

    // Then add another with base tools
    act(() => {
      updatedAllowedTools = result.current.allowToolPermanent(
        "Bash(grep:*)",
        updatedAllowedTools,
      );
    });

    expect(updatedAllowedTools).toEqual(["Bash(ls:*)", "Bash(grep:*)"]);
    expect(result.current.allowedTools).toEqual(["Bash(ls:*)", "Bash(grep:*)"]);
  });

  it("should reset permissions", () => {
    const { result } = renderHook(() => usePermissions());

    // Add some tools first
    act(() => {
      result.current.allowToolPermanent("Bash(ls:*)");
    });

    act(() => {
      result.current.allowToolPermanent("Bash(grep:*)");
    });

    expect(result.current.allowedTools).toEqual(["Bash(ls:*)", "Bash(grep:*)"]);

    // Reset permissions
    act(() => {
      result.current.resetPermissions();
    });

    expect(result.current.allowedTools).toEqual([]);
  });

  it("should handle compound permission scenario", () => {
    const { result } = renderHook(() => usePermissions());

    // Simulate compound command permission handling
    const patterns = ["Bash(ls:*)", "Bash(grep:*)"];
    let finalAllowedTools: string[] = [];

    act(() => {
      // Add all patterns like in the real permission handler
      let currentTools = result.current.allowedTools;
      patterns.forEach((pattern) => {
        currentTools = result.current.allowToolPermanent(pattern, currentTools);
      });
      finalAllowedTools = currentTools;
    });

    expect(finalAllowedTools).toEqual(["Bash(ls:*)", "Bash(grep:*)"]);
    expect(result.current.allowedTools).toEqual(["Bash(ls:*)", "Bash(grep:*)"]);
  });

  it("should handle empty patterns array gracefully", () => {
    const { result } = renderHook(() => usePermissions());

    act(() => {
      result.current.showPermissionRequest("Bash", [], "tool-123");
    });

    expect(result.current.permissionRequest).toEqual({
      isOpen: true,
      toolName: "Bash",
      patterns: [],
      toolUseId: "tool-123",
    });
  });

  it("should handle fallback patterns for command -v scenario", () => {
    const { result } = renderHook(() => usePermissions());

    // Simulate command -v case where fallback should provide command pattern
    const patterns = ["Bash(command:*)"];

    act(() => {
      result.current.showPermissionRequest("Bash", patterns, "tool-123");
    });

    expect(result.current.permissionRequest).toEqual({
      isOpen: true,
      toolName: "Bash",
      patterns: ["Bash(command:*)"],
      toolUseId: "tool-123",
    });
  });
});
