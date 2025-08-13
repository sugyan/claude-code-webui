import { useState, useCallback } from "react";
import type { PermissionMode } from "../../types";

interface PermissionRequest {
  isOpen: boolean;
  toolName: string;
  patterns: string[];
  toolUseId: string;
}

interface PlanModeRequest {
  isOpen: boolean;
  planContent: string;
}

interface UsePermissionsOptions {
  onPermissionModeChange?: (mode: PermissionMode) => void;
}

export function usePermissions(options: UsePermissionsOptions = {}) {
  const { onPermissionModeChange } = options;
  const [allowedTools, setAllowedTools] = useState<string[]>([]);
  const [permissionRequest, setPermissionRequest] =
    useState<PermissionRequest | null>(null);
  const [planModeRequest, setPlanModeRequest] =
    useState<PlanModeRequest | null>(null);

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

  const showPlanModeRequest = useCallback((planContent: string) => {
    setPlanModeRequest({
      isOpen: true,
      planContent,
    });
    setIsPermissionMode(true);
  }, []);

  const closePlanModeRequest = useCallback(() => {
    setPlanModeRequest(null);
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

  // Helper function to update permission mode based on user action
  const updatePermissionMode = useCallback(
    (mode: PermissionMode) => {
      onPermissionModeChange?.(mode);
    },
    [onPermissionModeChange],
  );

  return {
    allowedTools,
    permissionRequest,
    showPermissionRequest,
    closePermissionRequest,
    allowToolTemporary,
    allowToolPermanent,
    resetPermissions,
    isPermissionMode,
    setIsPermissionMode,
    planModeRequest,
    showPlanModeRequest,
    closePlanModeRequest,
    updatePermissionMode,
  };
}
