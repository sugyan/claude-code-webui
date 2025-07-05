/**
 * Main entry point for the backend
 *
 * This has been updated to use the new runtime abstraction architecture.
 * The actual logic has moved to app.ts and cli/deno.ts, but this file
 * is maintained for backward compatibility with existing tooling.
 */

import { createApp } from "./app.ts";
import { DenoRuntime } from "./runtime/deno.ts";
import { parseCliArgs } from "./cli/args.ts";

async function main() {
  // Initialize Deno runtime
  const runtime = new DenoRuntime();

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
    distPath: new URL("./dist", import.meta.url).pathname,
  });

  // Start server
  runtime.serve(args.port, args.host, app.fetch);
}

async function validateClaudeCli(runtime: DenoRuntime) {
  try {
    const result = await runtime.runCommand("claude", ["--version"]);

    if (result.success) {
      console.log(`✅ Claude CLI found: ${result.stdout.trim()}`);
    } else {
      console.warn("⚠️  Claude CLI check failed - some features may not work");
    }
  } catch (_error) {
    console.warn("⚠️  Claude CLI not found - please install claude-code");
    console.warn(
      "   Visit: https://claude.ai/code for installation instructions",
    );
  }
}

// Run the application
if (import.meta.main) {
  main().catch((error) => {
    console.error("Failed to start server:", error);
    Deno.exit(1);
  });
}
