/**
 * CLI argument parsing using runtime abstraction
 *
 * Handles command-line argument parsing in a runtime-agnostic way.
 */

import { program } from "commander";
import type { Runtime } from "../runtime/types.ts";
import { VERSION } from "./version.ts";

export interface ParsedArgs {
  debug: boolean;
  port: number;
  host: string;
  claudePath?: string;
}

export function parseCliArgs(runtime: Runtime): ParsedArgs {
  // Use version from auto-generated version.ts file
  const version = VERSION;

  // Get default port from environment
  const defaultPort = parseInt(runtime.getEnv("PORT") || "8080", 10);

  // Configure program
  program
    .name("claude-code-webui")
    .version(version, "-v, --version", "display version number")
    .description("Claude Code Web UI Backend Server")
    .option(
      "-p, --port <port>",
      "Port to listen on",
      (value) => {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          throw new Error(`Invalid port number: ${value}`);
        }
        return parsed;
      },
      defaultPort,
    )
    .option(
      "--host <host>",
      "Host address to bind to (use 0.0.0.0 for all interfaces)",
      "127.0.0.1",
    )
    .option(
      "--claude-path <path>",
      "Path to claude executable (overrides automatic detection)",
    )
    .option("-d, --debug", "Enable debug mode", false);

  // Parse arguments - Commander.js v14 handles this automatically
  program.parse(runtime.getArgs(), { from: "user" });
  const options = program.opts();

  // Handle DEBUG environment variable manually
  const debugEnv = runtime.getEnv("DEBUG");
  const debugFromEnv = debugEnv?.toLowerCase() === "true" || debugEnv === "1";

  return {
    debug: options.debug || debugFromEnv,
    port: options.port,
    host: options.host,
    claudePath: options.claudePath,
  };
}
