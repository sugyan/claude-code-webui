import { createContext } from "react";
import type { EnterBehavior } from "../types/enterBehavior";

interface EnterBehaviorContextType {
  enterBehavior: EnterBehavior;
  toggleEnterBehavior: () => void;
}

export const EnterBehaviorContext = createContext<
  EnterBehaviorContextType | undefined
>(undefined);
