import { createContext } from "react";
import type { SettingsContextType } from "../types/settings";

export const SettingsContext = createContext<SettingsContextType | null>(null);
