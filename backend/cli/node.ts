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

async function main(runtime: NodeRuntime) {
  // Parse CLI arguments
  const args = parseCliArgs(runtime);

  // Validate Claude CLI availability and get the validated path
  const validatedClaudePath = await validateClaudeCli(runtime, args.claudePath);

  if (args.debug) {
    console.log("🐛 Debug mode enabled");
  }

  // Create application
  const app = createApp(runtime, {
    debugMode: args.debug,
    staticPath: "./dist/static",
    claudePath: validatedClaudePath,
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
