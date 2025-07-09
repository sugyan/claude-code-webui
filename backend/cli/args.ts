/**
 * CLI argument parsing using runtime abstraction
 *
 * Handles command-line argument parsing in a runtime-agnostic way.
 */

import { program } from "commander";
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
    // Cross-platform path resolution for VERSION file
    let versionPath: string;
    if (
      typeof globalThis.process !== "undefined" &&
      globalThis.process.versions?.node
    ) {
      // Node.js environment
      const { fileURLToPath } = await import("node:url");
      const { dirname, join } = await import("node:path");
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      versionPath = join(__dirname, "../VERSION");
    } else {
      // Deno environment
      versionPath = new URL("../VERSION", import.meta.url).pathname;
    }

    const versionContent = await runtime.readTextFile(versionPath);
    version = versionContent.trim();
  } catch (error) {
    console.error(
      `Error reading VERSION file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    runtime.exit(1);
  }

  // Get default port from environment
  const defaultPort = parseInt(runtime.getEnv("PORT") || "8080", 10);

  // Configure program
  program
    .name("claude-code-webui")
    .version(version)
    .description("Claude Code Web UI Backend Server")
    .option("-p, --port <port>", "Port to listen on", (value) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        throw new Error(`Invalid port number: ${value}`);
      }
      return parsed;
    }, defaultPort)
    .option(
      "--host <host>",
      "Host address to bind to (use 0.0.0.0 for all interfaces)",
      "127.0.0.1",
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
  };
}
