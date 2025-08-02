/**
 * Minimal runtime abstraction layer
 *
 * Simple interfaces for abstracting runtime-specific operations
 * that are used in the backend application.
 */

import type { MiddlewareHandler } from "hono";

// Command execution result
export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number;
}

// Simplified runtime interface - only truly platform-specific operations
export interface Runtime {
  // Process execution (different APIs between Deno and Node.js)
  runCommand(
    command: string,
    args: string[],
    options?: { env?: Record<string, string> },
  ): Promise<CommandResult>;
  findExecutable(name: string): Promise<string[]>;

  // HTTP server (different implementations)
  serve(
    port: number,
    hostname: string,
    handler: (req: Request) => Response | Promise<Response>,
  ): void;

  // Static file serving (different middleware)
  createStaticFileMiddleware(options: { root: string }): MiddlewareHandler;
}
