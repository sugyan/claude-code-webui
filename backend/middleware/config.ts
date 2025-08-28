import { createMiddleware } from "hono/factory";
import type { Runtime } from "../runtime/types.ts";

export interface AppConfig {
  debugMode: boolean;
  runtime: Runtime;
  cliPath: string;
}

/**
 * Creates configuration middleware that makes app-wide settings available to all handlers
 * via context variables. This eliminates the need to pass configuration parameters
 * to individual handler functions.
 *
 * @param options Configuration options
 * @returns Hono middleware function
 */
export function createConfigMiddleware(options: AppConfig) {
  return createMiddleware<ConfigContext>(async (c, next) => {
    // Set configuration in context for access by handlers
    c.set("config", options);
    c.set("debugMode", options.debugMode);
    c.set("runtime", options.runtime);
    c.set("cliPath", options.cliPath);

    await next();
  });
}

export interface User {
  username: string;
  uid: number;
  homeDirectory: string;
  projectsPath: string;
  authenticated: true;
}

/**
 * Type helper to ensure handlers can access the config variable
 * This can be used to extend the context type in handlers if needed
 */
export type ConfigContext = {
  Variables: {
    config: AppConfig;
    debugMode: boolean;
    runtime: Runtime;
    cliPath: string;
    user?: User;
  };
};
