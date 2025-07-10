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
import { dirname, join } from "node:path";

// Get directory path for this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main(runtime: NodeRuntime) {
  // Parse CLI arguments
  const args = parseCliArgs(runtime);

  console.log(`🚀 Server starting on ${args.host}:${args.port}`);

  // Validate Claude CLI availability
  await validateClaudeCli(runtime);

  if (args.debug) {
    console.log("🐛 Debug mode enabled");
  }

  // Create application
  const app = createApp(runtime, {
    debugMode: args.debug,
    staticPath: join(__dirname, "../static"),
  });

  // Start server
  runtime.serve(args.port, args.host, app.fetch);
}

// Run the application
const runtime = new NodeRuntime();
main(runtime).catch((error) => {
  console.error("Failed to start server:", error);
  runtime.exit(1);
});
