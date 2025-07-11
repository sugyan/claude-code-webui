/**
 * Backend-specific type definitions
 */

import type { Runtime } from "./runtime/types.ts";

// Application configuration shared across backend handlers
export interface AppConfig {
  debugMode: boolean;
  runtime: Runtime;
  claudePath: string; // Now required since validateClaudeCli always returns a path
  // Future configuration options can be added here
}
