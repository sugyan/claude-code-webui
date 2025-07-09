/**
 * Node.js-specific entry point
 *
 * This module handles Node.js-specific initialization including CLI argument parsing,
 * Claude CLI validation, and server startup using the NodeRuntime.
 */

import { createApp } from "../app.js";
import { NodeRuntime } from "../runtime/node.js";
import { parseCliArgs } from "./args.js";
import { validateClaudeCli } from "./validation.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Get directory path for this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main(runtime: NodeRuntime) {
  // Parse CLI arguments
  const args = await parseCliArgs(runtime);

  console.log(`🚀 Server starting on ${args.host}:${args.port}`);

  // Validate Claude CLI availability
  await validateClaudeCli(runtime);

  if (args.debug) {
    console.log("🐛 Debug mode enabled");
  }

  // Create application
  const app = createApp(runtime, {
    debugMode: args.debug,
    distPath: join(__dirname, "../dist"),
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
