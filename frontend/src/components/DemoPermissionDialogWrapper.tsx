import { useState, useEffect, useRef } from "react";
import { PermissionDialog } from "./PermissionDialog";

interface DemoPermissionDialogWrapperProps {
  isOpen: boolean;
  patterns: string[];
  onAllow: () => void;
  onAllowPermanent: () => void;
  onDeny: () => void;
  onClose: () => void;
  autoClickButton?: "allow" | "allowPermanent" | null;
}

/**
 * Clean wrapper that adds demo functionality to PermissionDialog via extension point.
 *
 * Benefits:
 * 1. Minimal modification to original component (just one optional prop)
 * 2. UI elements automatically synchronized
 * 3. Demo logic cleanly separated
 * 4. Visual feedback included (highlight effects)
 */
export function DemoPermissionDialogWrapper({
  autoClickButton,
  onAllow,
  onAllowPermanent,
  onDeny,
  ...permissionDialogProps
}: DemoPermissionDialogWrapperProps) {
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [clickedButton, setClickedButton] = useState<string | null>(null);
  const timersRef = useRef<{
    focus?: NodeJS.Timeout;
    action?: NodeJS.Timeout;
    clickEffect?: NodeJS.Timeout;
  }>({});

  // Auto-click effect with focus sequence animation
  useEffect(() => {
    if (autoClickButton && permissionDialogProps.isOpen) {
      const timers = timersRef.current;

      if (autoClickButton === "allowPermanent") {
        // For allowPermanent: sequence 1st → 2nd button
        setActiveButton("allow");

        timers.focus = setTimeout(() => {
          setActiveButton("allowPermanent");
        }, 500);

        timers.action = setTimeout(() => {
          setClickedButton("allowPermanent");
          timers.clickEffect = setTimeout(() => {
            onAllowPermanent();
          }, 200);
        }, 1200);
      } else if (autoClickButton === "allow") {
        // For allow: direct focus on button
        setActiveButton("allow");

        timers.action = setTimeout(() => {
          setClickedButton("allow");
          timers.clickEffect = setTimeout(() => {
            onAllow();
          }, 200);
        }, 700);
      }

      return () => {
        if (timers.focus) clearTimeout(timers.focus);
        if (timers.action) clearTimeout(timers.action);
        if (timers.clickEffect) clearTimeout(timers.clickEffect);
      };
    }
  }, [
    autoClickButton,
    permissionDialogProps.isOpen,
    onAllow,
    onAllowPermanent,
  ]);

  // Reset states when dialog closes
  useEffect(() => {
    if (!permissionDialogProps.isOpen) {
      setActiveButton(null);
      setClickedButton(null);
    }
  }, [permissionDialogProps.isOpen]);

  // Button class enhancement function
  const getButtonClassName = (
    buttonType: "allow" | "allowPermanent" | "deny",
    defaultClassName: string,
  ) => {
    const isActive = activeButton === buttonType;
    const isClicked = clickedButton === buttonType;

    // Pressed state (brief moment before action)
    if (isClicked) {
      return `${defaultClassName} ring-2 ring-white/70`;
    }

    // Demo focus state (subtle addition to normal styles)
    if (isActive) {
      if (buttonType === "allowPermanent") {
        return `${defaultClassName} ring-1 ring-green-300`;
      } else if (buttonType === "allow") {
        return `${defaultClassName} ring-1 ring-blue-300`;
      }
    }

    // Default state (normal styles)
    return defaultClassName;
  };

  return (
    <PermissionDialog
      {...permissionDialogProps}
      onAllow={onAllow}
      onAllowPermanent={onAllowPermanent}
      onDeny={onDeny}
      getButtonClassName={getButtonClassName}
    />
  );
}
