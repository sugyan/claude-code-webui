import { useState, useEffect } from "react";
import { STORAGE_KEYS, getStorageItem, setStorageItem } from "../utils/storage";

export type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize theme on client side
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const defaultTheme = prefersDark ? "dark" : "light";
    const saved = getStorageItem(STORAGE_KEYS.THEME, defaultTheme);

    setTheme(saved);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const root = window.document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    setStorageItem(STORAGE_KEYS.THEME, theme);
  }, [theme, isInitialized]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return { theme, toggleTheme };
}
