import { useState, useCallback } from "react";

interface PermissionRequest {
  isOpen: boolean;
  toolName: string;
  patterns: string[];
  toolUseId: string;
}

export function usePermissions() {
  const [allowedTools, setAllowedTools] = useState<string[]>([]);
  const [permissionRequest, setPermissionRequest] =
    useState<PermissionRequest | null>(null);

  // New state for inline permission system
  const [isPermissionMode, setIsPermissionMode] = useState(false);

  const showPermissionRequest = useCallback(
    (toolName: string, patterns: string[], toolUseId: string) => {
      setPermissionRequest({
        isOpen: true,
        toolName,
        patterns,
        toolUseId,
      });
      // Enable inline permission mode
      setIsPermissionMode(true);
    },
    [],
  );

  const closePermissionRequest = useCallback(() => {
    setPermissionRequest(null);
    // Disable inline permission mode
    setIsPermissionMode(false);
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
    permissionRequest,
    showPermissionRequest,
    closePermissionRequest,
    allowToolTemporary,
    allowToolPermanent,
    resetPermissions,
    // New inline permission system exports
    isPermissionMode,
    setIsPermissionMode,
  };
}
