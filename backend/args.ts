/**
 * CLI argument parsing using runtime abstraction
 *
 * Handles command-line argument parsing in a runtime-agnostic way.
 */

import { Command } from "@cliffy/command";
import type { Runtime } from "./runtime/types.ts";

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
      new URL("./VERSION", import.meta.url).pathname,
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

  const { options } = await new Command()
    .name("claude-code-webui")
    .version(version)
    .description("Claude Code Web UI Backend Server")
    .option("-p, --port <port:number>", "Port to listen on", {
      default: parseInt(runtime.getEnv("PORT") || "8080", 10),
    })
    .option(
      "--host <host:string>",
      "Host address to bind to (use 0.0.0.0 for all interfaces)",
      {
        default: "127.0.0.1",
      },
    )
    .option("-d, --debug", "Enable debug mode")
    .env("DEBUG=<enable:boolean>", "Enable debug mode")
    .parse(runtime.getArgs());

  return {
    debug: options.debug || false,
    port: options.port,
    host: options.host,
  };
}
