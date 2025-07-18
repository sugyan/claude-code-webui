/**
 * Backend-specific type definitions
 */

import type { Runtime } from "./runtime/types.ts";

// Application configuration shared across backend handlers
export interface AppConfig {
  debugMode: boolean;
  runtime: Runtime;
  cliPath: string; // Path to actual CLI script detected by validateClaudeCli
  // Future configuration options can be added here
}
