/**
 * Shared CLI validation utilities
 *
 * Common validation functions used across different runtime CLI entry points.
 */

import type { Runtime } from "../runtime/types.ts";

/**
 * Validates that the Claude CLI is available and working
 * Uses platform-specific command (`which` on Unix, `where` on Windows) for PATH detection
 * Exits process if Claude CLI is not found or not working
 * @param runtime - Runtime abstraction for system operations
 * @param customPath - Optional custom path to claude executable to validate
 * @returns Promise<string> - The validated path to claude executable
 */
export async function validateClaudeCli(
  runtime: Runtime,
  customPath?: string,
): Promise<string> {
  try {
    let claudePath = "";

    if (customPath) {
      // Use custom path if provided
      claudePath = customPath;
      console.log(`🔍 Validating custom Claude path: ${customPath}`);
    } else {
      // Auto-detect using runtime's findExecutable method
      console.log("🔍 Searching for Claude CLI in PATH...");
      const candidates = await runtime.findExecutable("claude");

      if (candidates.length === 0) {
        console.error("❌ Claude CLI not found in PATH");
        console.error("   Please install claude-code globally:");
        console.error(
          "   Visit: https://claude.ai/code for installation instructions",
        );
        runtime.exit(1);
      }

      // Try each candidate until one works
      let validPath = "";
      for (const candidate of candidates) {
        const testResult = await runtime.runCommand(candidate, ["--version"]);

        if (testResult.success) {
          validPath = candidate;
          break;
        }
      }

      if (!validPath) {
        console.error("❌ Claude CLI found but none are working properly");
        console.error("   Found candidates:", candidates);
        console.error(
          "   Please reinstall claude-code or check your installation",
        );
        runtime.exit(1);
      }

      claudePath = validPath;
    }

    // For custom paths, verify they work
    if (customPath) {
      const versionResult = await runtime.runCommand(claudePath, ["--version"]);

      if (!versionResult.success) {
        console.error("❌ Custom Claude path not working properly");
        console.error(
          "   Please check your custom path or reinstall claude-code",
        );
        runtime.exit(1);
      }
    }

    // Get version for final validation and display
    const versionResult = await runtime.runCommand(claudePath, ["--version"]);
    if (versionResult.success) {
      console.log(`✅ Claude CLI found: ${versionResult.stdout.trim()}`);
      console.log(`   Path: ${claudePath}`);
      return claudePath;
    } else {
      console.error("❌ Claude CLI found but not working properly");
      console.error(
        "   Please reinstall claude-code or check your installation",
      );
      runtime.exit(1);
    }
  } catch (error) {
    console.error("❌ Failed to validate Claude CLI");
    console.error(
      `   Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    runtime.exit(1);
  }
}
