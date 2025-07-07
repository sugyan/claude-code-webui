/**
 * CLI argument parsing using runtime abstraction
 *
 * Handles command-line argument parsing in a runtime-agnostic way.
 */

import { Command } from "commander";
import type { Runtime } from "../runtime/types.ts";

export interface ParsedArgs {
  debug: boolean;
  port: number;
  host: string;
}

export async function parseCliArgs(runtime: Runtime): Promise<ParsedArgs> {
  // Read version from VERSION file
  let version = "unknown";
  try {
    const versionContent = await runtime.readTextFile(
      new URL("../VERSION", import.meta.url).pathname,
    );
    version = versionContent.trim();
  } catch (error) {
    console.error(
      `Error reading VERSION file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    runtime.exit(1);
  }

  const program = new Command()
    .name("claude-code-webui")
    .version(version)
    .description("Claude Code Web UI Backend Server")
    .option("-p, --port <port>", "Port to listen on", (value) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        throw new Error(`Invalid port number: ${value}`);
      }
      return parsed;
    }, parseInt(runtime.getEnv("PORT") || "8080", 10))
    .option(
      "--host <host>",
      "Host address to bind to (use 0.0.0.0 for all interfaces)",
      "127.0.0.1",
    )
    .option("-d, --debug", "Enable debug mode", false);

  const args = runtime.getArgs();

  // Commander.js expects process.argv format: [node, script, ...args]
  // Deno.args only contains the actual arguments, so we need to prepend dummy values
  const commanderArgs = ["deno", "cli/deno.ts", ...args];

  program.parse(commanderArgs);
  const options = program.opts();

  // Handle DEBUG environment variable manually
  const debugEnv = runtime.getEnv("DEBUG");
  const debugFromEnv = debugEnv?.toLowerCase() === "true" || debugEnv === "1";

  return {
    debug: options.debug || debugFromEnv,
    port: options.port,
    host: options.host,
  };
}
