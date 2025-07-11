/**
 * Shared CLI validation utilities
 *
 * Common validation functions used across different runtime CLI entry points.
 */

import type { Runtime } from "../runtime/types.ts";

/**
 * Validates that the Claude CLI is available and working
 * Uses `which` command to ensure proper PATH detection without npm package interference
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
    let claudePath: string;

    if (customPath) {
      // Use custom path if provided
      claudePath = customPath;
      console.log(`🔍 Validating custom Claude path: ${customPath}`);
    } else {
      // Auto-detect using which command
      const whichResult = await runtime.runCommand("which", ["claude"]);

      if (!whichResult.success || !whichResult.stdout.trim()) {
        console.error("❌ Claude CLI not found in PATH");
        console.error("   Please install claude-code globally:");
        console.error(
          "   Visit: https://claude.ai/code for installation instructions",
        );
        runtime.exit(1);
      }

      claudePath = whichResult.stdout.trim();
    }

    // Verify the claude executable works
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
