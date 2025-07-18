#!/usr/bin/env node
/**
 * Node.js-specific entry point
 *
 * This module handles Node.js-specific initialization including CLI argument parsing,
 * Claude CLI validation, and server startup using the NodeRuntime.
 */

import { createApp } from "../app.ts";
import { NodeRuntime } from "../runtime/node.ts";
import { parseCliArgs } from "./args.ts";
import { validateClaudeCli } from "./validation.ts";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

async function main(runtime: NodeRuntime) {
  // Parse CLI arguments
  const args = parseCliArgs(runtime);

  // Validate Claude CLI availability and get the detected CLI path
  const cliPath = await validateClaudeCli(runtime, args.claudePath);

  if (args.debug) {
    console.log("🐛 Debug mode enabled");
  }

  // Calculate static path relative to current working directory
  // Node.js 20.11.0+ compatible with fallback for older versions
  const __dirname =
    import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
  const staticAbsPath = join(__dirname, "../static");
  let staticRelPath = relative(process.cwd(), staticAbsPath);
  // Handle edge case where relative() returns empty string
  if (staticRelPath === "") {
    staticRelPath = ".";
  }

  // Create application
  const app = createApp(runtime, {
    debugMode: args.debug,
    staticPath: staticRelPath,
    cliPath: cliPath,
  });

  // Start server (only show this message when everything is ready)
  console.log(`🚀 Server starting on ${args.host}:${args.port}`);
  runtime.serve(args.port, args.host, app.fetch);
}

// Run the application
const runtime = new NodeRuntime();
main(runtime).catch((error) => {
  console.error("Failed to start server:", error);
  runtime.exit(1);
});
