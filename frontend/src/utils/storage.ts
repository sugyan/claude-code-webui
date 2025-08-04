export const STORAGE_KEYS = {
  THEME: "claude-code-webui-theme",
  ENTER_BEHAVIOR: "claude-code-webui-enter-behavior",
  PERMISSION_MODE: "claude-code-webui-permission-mode",
} as const;

// Type-safe storage utilities
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail if localStorage is not available
  }
}
