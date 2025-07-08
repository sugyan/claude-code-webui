import { useState, useCallback } from "react";

interface PermissionDialog {
  isOpen: boolean;
  toolName: string;
  patterns: string[];
  toolUseId: string;
}

export function usePermissions() {
  const [allowedTools, setAllowedTools] = useState<string[]>([]);
  const [permissionDialog, setPermissionDialog] =
    useState<PermissionDialog | null>(null);

  const showPermissionDialog = useCallback(
    (toolName: string, patterns: string[], toolUseId: string) => {
      setPermissionDialog({
        isOpen: true,
        toolName,
        patterns,
        toolUseId,
      });
    },
    [],
  );

  const closePermissionDialog = useCallback(() => {
    setPermissionDialog(null);
  }, []);

  const allowToolTemporary = useCallback(
    (pattern: string, baseTools?: string[]) => {
      const currentAllowedTools = baseTools || allowedTools;
      return [...currentAllowedTools, pattern];
    },
    [allowedTools],
  );

  const allowToolPermanent = useCallback(
    (pattern: string, baseTools?: string[]) => {
      const currentAllowedTools = baseTools || allowedTools;
      const updatedAllowedTools = [...currentAllowedTools, pattern];
      setAllowedTools(updatedAllowedTools);
      return updatedAllowedTools;
    },
    [allowedTools],
  );

  const resetPermissions = useCallback(() => {
    setAllowedTools([]);
  }, []);

  return {
    allowedTools,
    permissionDialog,
    showPermissionDialog,
    closePermissionDialog,
    allowToolTemporary,
    allowToolPermanent,
    resetPermissions,
  };
}
