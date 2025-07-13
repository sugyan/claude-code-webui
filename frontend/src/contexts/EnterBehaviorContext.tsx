import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { EnterBehavior } from "../types/enterBehavior";
import { EnterBehaviorContext } from "./EnterBehaviorContextDefinition";

export function EnterBehaviorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [enterBehavior, setEnterBehavior] = useState<EnterBehavior>("send");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize enter behavior on client side
    const saved = localStorage.getItem("enterBehavior") as EnterBehavior;

    if (saved && (saved === "send" || saved === "newline")) {
      setEnterBehavior(saved);
    } else {
      // Default to "send" (traditional behavior)
      setEnterBehavior("send");
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    localStorage.setItem("enterBehavior", enterBehavior);
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
