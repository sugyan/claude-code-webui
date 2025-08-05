import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { EnterBehavior } from "../types/enterBehavior";
import { EnterBehaviorContext } from "./EnterBehaviorContextDefinition";
import { STORAGE_KEYS, getStorageItem, setStorageItem } from "../utils/storage";

export function EnterBehaviorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [enterBehavior, setEnterBehavior] = useState<EnterBehavior>("send");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize enter behavior on client side
    const saved = getStorageItem(STORAGE_KEYS.ENTER_BEHAVIOR, "send");

    setEnterBehavior(saved);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    setStorageItem(STORAGE_KEYS.ENTER_BEHAVIOR, enterBehavior);
  }, [enterBehavior, isInitialized]);

  const toggleEnterBehavior = useCallback(() => {
    setEnterBehavior((prev) => (prev === "send" ? "newline" : "send"));
  }, []);

  const value = useMemo(
    () => ({ enterBehavior, toggleEnterBehavior }),
    [enterBehavior, toggleEnterBehavior],
  );

  return (
    <EnterBehaviorContext.Provider value={value}>
      {children}
    </EnterBehaviorContext.Provider>
  );
}
