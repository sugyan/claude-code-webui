import { useContext } from "react";
import { SettingsContext } from "../contexts/SettingsContextTypes";
import type { SettingsContextType } from "../types/settings";

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

// Backward compatibility hooks for easier migration
export function useTheme() {
  const { theme, toggleTheme } = useSettings();
  return { theme, toggleTheme };
}

export function useEnterBehavior() {
  const { enterBehavior, toggleEnterBehavior } = useSettings();
  return { enterBehavior, toggleEnterBehavior };
}

// Re-export types for convenience
export type { Theme, EnterBehavior } from "../types/settings";
