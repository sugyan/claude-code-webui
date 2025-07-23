import { PermissionDialog } from "./PermissionDialog";

interface DemoPermissionDialogWrapperProps {
  isOpen: boolean;
  patterns: string[];
  onAllow: () => void;
  onAllowPermanent: () => void;
  onDeny: () => void;
  onClose: () => void;
  activeButton?: string | null;
  clickedButton?: string | null;
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
  activeButton,
  clickedButton,
  onAllow,
  onAllowPermanent,
  onDeny,
  ...permissionDialogProps
}: DemoPermissionDialogWrapperProps) {
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
