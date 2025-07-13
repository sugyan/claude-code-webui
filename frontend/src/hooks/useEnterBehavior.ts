import { useContext } from "react";
import { EnterBehaviorContext } from "../contexts/EnterBehaviorContextDefinition";
export type { EnterBehavior } from "../types/enterBehavior";

export function useEnterBehavior() {
  const context = useContext(EnterBehaviorContext);
  if (!context) {
    throw new Error(
      "useEnterBehavior must be used within an EnterBehaviorProvider",
    );
  }
  return context;
}
