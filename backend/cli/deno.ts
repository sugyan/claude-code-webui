/**
 * Deno-specific entry point
 *
 * This module handles Deno-specific initialization including CLI argument parsing,
 * Claude CLI validation, and server startup using the DenoRuntime.
 */

import { createApp } from "../app.ts";
import { DenoRuntime } from "../runtime/deno.ts";
import { parseCliArgs } from "./args.ts";
import { validateClaudeCli } from "./validation.ts";

async function main(runtime: DenoRuntime) {
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
    staticPath: new URL("../static", import.meta.url).pathname,
  });

  // Start server
  runtime.serve(args.port, args.host, app.fetch);
}

// Run the application
if (import.meta.main) {
  const runtime = new DenoRuntime();
  main(runtime).catch((error) => {
    console.error("Failed to start server:", error);
    runtime.exit(1);
  });
}
