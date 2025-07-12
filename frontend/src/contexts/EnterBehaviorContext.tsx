import React, { createContext, useContext, useState, useEffect } from "react";

export type EnterBehavior = "send" | "newline";

interface EnterBehaviorContextType {
  enterBehavior: EnterBehavior;
  toggleEnterBehavior: () => void;
}

const EnterBehaviorContext = createContext<
  EnterBehaviorContextType | undefined
>(undefined);

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

  const toggleEnterBehavior = () => {
    setEnterBehavior((prev) => (prev === "send" ? "newline" : "send"));
  };

  return (
    <EnterBehaviorContext.Provider
      value={{ enterBehavior, toggleEnterBehavior }}
    >
      {children}
    </EnterBehaviorContext.Provider>
  );
}

export function useEnterBehavior() {
  const context = useContext(EnterBehaviorContext);
  if (!context) {
    throw new Error(
      "useEnterBehavior must be used within an EnterBehaviorProvider",
    );
  }
  return context;
}
