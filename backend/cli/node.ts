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
import { setupLogger, logger } from "../utils/logger.ts";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { exit } from "../utils/os.ts";

async function main(runtime: NodeRuntime) {
  // Parse CLI arguments
  const args = parseCliArgs();

  // Initialize logging system
  await setupLogger(args.debug);

  if (args.debug) {
    logger.cli.info("🐛 Debug mode enabled");
  }

  // Validate Claude CLI availability and get the detected CLI path
  const cliPath = await validateClaudeCli(runtime, args.claudePath);

  // Use absolute path for static files (supported in @hono/node-server v1.17.0+)
  // Node.js 20.11.0+ compatible with fallback for older versions
  const __dirname =
    import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
  const staticPath = join(__dirname, "../static");

  // Create application
  const app = createApp(runtime, {
    debugMode: args.debug,
    staticPath,
    cliPath,
  });

  // Start server (only show this message when everything is ready)
  logger.cli.info(`🚀 Server starting on ${args.host}:${args.port}`);
  runtime.serve(args.port, args.host, app.fetch);
}

// Run the application
const runtime = new NodeRuntime();
main(runtime).catch((error) => {
  // Logger may not be initialized yet, so use console.error
  console.error("Failed to start server:", error);
  exit(1);
});
