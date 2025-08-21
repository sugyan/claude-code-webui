import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlanPermissionInputPanel } from "./PlanPermissionInputPanel";

describe("PlanPermissionInputPanel", () => {
  const mockOnAcceptWithEdits = vi.fn();
  const mockOnAcceptDefault = vi.fn();
  const mockOnKeepPlanning = vi.fn();
  const mockOnSelectionChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any event listeners
    document.removeEventListener("keydown", vi.fn());
  });

  describe("Basic Rendering", () => {
    it("should render all three permission options", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
        />,
      );

      expect(
        screen.getByText("Yes, and auto-accept edits"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Yes, and manually approve edits"),
      ).toBeInTheDocument();
      expect(screen.getByText("No, keep planning")).toBeInTheDocument();
    });

    it("should render helper text", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
        />,
      );

      expect(
        screen.getByText("Choose how to proceed (Press ESC to keep planning)"),
      ).toBeInTheDocument();
    });

    it("should initially select 'acceptWithEdits' option", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
        />,
      );

      const acceptWithEditsButton = screen
        .getByText("Yes, and auto-accept edits")
        .closest("button")!;
      expect(acceptWithEditsButton).toHaveClass(
        "bg-green-50",
        "border-green-500",
      );
    });
  });

  describe("Mouse Interactions", () => {
    it("should call onAcceptWithEdits when accept with edits button is clicked", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
        />,
      );

      fireEvent.click(screen.getByText("Yes, and auto-accept edits"));
      expect(mockOnAcceptWithEdits).toHaveBeenCalledTimes(1);
    });

    it("should call onAcceptDefault when accept default button is clicked", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
        />,
      );

      fireEvent.click(screen.getByText("Yes, and manually approve edits"));
      expect(mockOnAcceptDefault).toHaveBeenCalledTimes(1);
    });

    it("should call onKeepPlanning when keep planning button is clicked", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
        />,
      );

      fireEvent.click(screen.getByText("No, keep planning"));
      expect(mockOnKeepPlanning).toHaveBeenCalledTimes(1);
    });

    it("should update selection on mouse enter", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
          onSelectionChange={mockOnSelectionChange}
        />,
      );

      const acceptDefaultButton = screen
        .getByText("Yes, and manually approve edits")
        .closest("button")!;
      fireEvent.mouseEnter(acceptDefaultButton);

      expect(mockOnSelectionChange).toHaveBeenCalledWith("acceptDefault");
      expect(acceptDefaultButton).toHaveClass("bg-blue-50", "border-blue-500");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should navigate down with ArrowDown key", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
          onSelectionChange={mockOnSelectionChange}
        />,
      );

      // Initially acceptWithEdits is selected
      fireEvent.keyDown(document, { key: "ArrowDown" });

      expect(mockOnSelectionChange).toHaveBeenCalledWith("acceptDefault");
    });

    it("should navigate up with ArrowUp key", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
          onSelectionChange={mockOnSelectionChange}
        />,
      );

      // Initially acceptWithEdits is selected, going up should go to keepPlanning (wrapping)
      fireEvent.keyDown(document, { key: "ArrowUp" });

      expect(mockOnSelectionChange).toHaveBeenCalledWith("keepPlanning");
    });

    it("should cycle through options with multiple ArrowDown presses", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
          onSelectionChange={mockOnSelectionChange}
        />,
      );

      fireEvent.keyDown(document, { key: "ArrowDown" }); // acceptWithEdits -> acceptDefault
      fireEvent.keyDown(document, { key: "ArrowDown" }); // acceptDefault -> keepPlanning
      fireEvent.keyDown(document, { key: "ArrowDown" }); // keepPlanning -> acceptWithEdits (wrapping)

      expect(mockOnSelectionChange).toHaveBeenCalledTimes(3);
      expect(mockOnSelectionChange).toHaveBeenNthCalledWith(1, "acceptDefault");
      expect(mockOnSelectionChange).toHaveBeenNthCalledWith(2, "keepPlanning");
      expect(mockOnSelectionChange).toHaveBeenNthCalledWith(
        3,
        "acceptWithEdits",
      );
    });

    it("should execute selected option with Enter key", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
        />,
      );

      // Initially acceptWithEdits is selected
      fireEvent.keyDown(document, { key: "Enter" });
      expect(mockOnAcceptWithEdits).toHaveBeenCalledTimes(1);

      // Navigate to acceptDefault and press Enter
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "Enter" });
      expect(mockOnAcceptDefault).toHaveBeenCalledTimes(1);

      // Navigate to keepPlanning and press Enter
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "Enter" });
      expect(mockOnKeepPlanning).toHaveBeenCalledTimes(1);
    });

    it("should call onKeepPlanning when Escape key is pressed", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
        />,
      );

      fireEvent.keyDown(document, { key: "Escape" });
      expect(mockOnKeepPlanning).toHaveBeenCalledTimes(1);
    });
  });

  describe("External Control Mode (Demo Automation)", () => {
    it("should use external selection when provided", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
          externalSelectedOption="acceptDefault"
        />,
      );

      const acceptDefaultButton = screen
        .getByText("Yes, and manually approve edits")
        .closest("button")!;
      expect(acceptDefaultButton).toHaveClass("bg-blue-50", "border-blue-500");
    });

    it("should not respond to keyboard navigation when externally controlled", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
          externalSelectedOption="acceptDefault"
          onSelectionChange={mockOnSelectionChange}
        />,
      );

      // Keyboard navigation should be disabled
      fireEvent.keyDown(document, { key: "ArrowDown" });

      // onSelectionChange should not be called for keyboard events in external mode
      expect(mockOnSelectionChange).not.toHaveBeenCalled();

      // Selection should remain on acceptDefault
      const acceptDefaultButton = screen
        .getByText("Yes, and manually approve edits")
        .closest("button")!;
      expect(acceptDefaultButton).toHaveClass("bg-blue-50", "border-blue-500");
    });

    it("should not reset selection on mouse leave when externally controlled", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
          externalSelectedOption="acceptDefault"
        />,
      );

      const acceptDefaultButton = screen
        .getByText("Yes, and manually approve edits")
        .closest("button")!;

      fireEvent.mouseLeave(acceptDefaultButton);

      // Selection should remain unchanged in external control mode
      expect(acceptDefaultButton).toHaveClass("bg-blue-50", "border-blue-500");
    });

    it("should handle external selection change", () => {
      const { rerender } = render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
          externalSelectedOption="acceptDefault"
        />,
      );

      // Change external selection
      rerender(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
          externalSelectedOption="keepPlanning"
        />,
      );

      const keepPlanningButton = screen
        .getByText("No, keep planning")
        .closest("button")!;
      expect(keepPlanningButton).toHaveClass("bg-slate-50", "border-slate-400");
    });
  });

  describe("Custom Button Styling", () => {
    it("should apply custom button class names", () => {
      const mockGetButtonClassName = vi.fn(
        (buttonType, defaultClassName) =>
          `${defaultClassName} custom-${buttonType}`,
      );

      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
          getButtonClassName={mockGetButtonClassName}
        />,
      );

      expect(mockGetButtonClassName).toHaveBeenCalledWith(
        "acceptWithEdits",
        expect.any(String),
      );
      expect(mockGetButtonClassName).toHaveBeenCalledWith(
        "acceptDefault",
        expect.any(String),
      );
      expect(mockGetButtonClassName).toHaveBeenCalledWith(
        "keepPlanning",
        expect.any(String),
      );

      const acceptWithEditsButton = screen
        .getByText("Yes, and auto-accept edits")
        .closest("button")!;
      expect(acceptWithEditsButton).toHaveClass("custom-acceptWithEdits");
    });
  });

  describe("Focus Management", () => {
    it("should update selection on focus", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
          onSelectionChange={mockOnSelectionChange}
        />,
      );

      const acceptDefaultButton = screen
        .getByText("Yes, and manually approve edits")
        .closest("button")!;
      fireEvent.focus(acceptDefaultButton);

      expect(mockOnSelectionChange).toHaveBeenCalledWith("acceptDefault");
    });

    it("should clear selection on blur when not externally controlled", () => {
      render(
        <PlanPermissionInputPanel
          onAcceptWithEdits={mockOnAcceptWithEdits}
          onAcceptDefault={mockOnAcceptDefault}
          onKeepPlanning={mockOnKeepPlanning}
        />,
      );

      const acceptDefaultButton = screen
        .getByText("Yes, and manually approve edits")
        .closest("button")!;

      fireEvent.focus(acceptDefaultButton);
      fireEvent.blur(acceptDefaultButton);

      // After blur, no button should have selected styling
      expect(acceptDefaultButton).not.toHaveClass(
        "bg-blue-50",
        "border-blue-500",
      );
    });
  });
});
