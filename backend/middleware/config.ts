import { createMiddleware } from "hono/factory";
import type { AppConfig } from "../types.ts";
import type { Runtime } from "../runtime/types.ts";

/**
 * Configuration options for the middleware
 */
interface ConfigOptions {
  debugMode: boolean;
  runtime: Runtime;
}

/**
 * Creates configuration middleware that makes app-wide settings available to all handlers
 * via context variables. This eliminates the need to pass configuration parameters
 * to individual handler functions.
 *
 * @param options Configuration options
 * @returns Hono middleware function
 */
export function createConfigMiddleware(options: ConfigOptions) {
  return createMiddleware<{
    Variables: {
      config: AppConfig;
    };
  }>(async (c, next) => {
    // Initialize application configuration
    const config: AppConfig = {
      debugMode: options.debugMode,
      runtime: options.runtime,
      // Future configuration options can be added here
    };

    // Set configuration in context for access by handlers
    c.set("config", config);

    await next();
  });
}

/**
 * Type helper to ensure handlers can access the config variable
 * This can be used to extend the context type in handlers if needed
 */
export type ConfigContext = {
  Variables: {
    config: AppConfig;
  };
};
