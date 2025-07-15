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
      // Auto-detect using platform-specific command
      const platform = runtime.getPlatform();

      if (platform === "windows") {
        // Try multiple possible executable names on Windows
        const candidates = ["claude", "claude.exe", "claude.cmd"];
        let found = false;

        console.log("🔍 Windows: Searching for Claude CLI in PATH...");
        for (const candidate of candidates) {
          console.log(`   Checking: ${candidate}`);
          const result = await runtime.runCommand("where", [candidate]);
          console.log(
            `   Result: success=${result.success}, stdout="${result.stdout.trim()}", stderr="${result.stderr.trim()}"`,
          );

          if (result.success && result.stdout.trim()) {
            claudePath = result.stdout.trim();
            found = true;
            console.log(`✅ Found Claude CLI: ${claudePath}`);
            break;
          }
        }

        if (!found) {
          console.error("❌ Claude CLI not found in PATH");
          console.error("   Searched for: claude, claude.exe, claude.cmd");
          console.error("   Please install claude-code globally:");
          console.error(
            "   Visit: https://claude.ai/code for installation instructions",
          );
          runtime.exit(1);
        }
      } else {
        // Unix-like systems (macOS, Linux)
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
    }

    // Verify the claude executable works
    console.log(`🔍 Testing Claude CLI execution: ${claudePath} --version`);
    const versionResult = await runtime.runCommand(claudePath, ["--version"]);
    console.log(
      `   Command result: success=${versionResult.success}, code=${versionResult.code}`,
    );
    console.log(`   stdout: "${versionResult.stdout.trim()}"`);
    console.log(`   stderr: "${versionResult.stderr.trim()}"`);

    if (versionResult.success) {
      console.log(`✅ Claude CLI found: ${versionResult.stdout.trim()}`);
      console.log(`   Path: ${claudePath}`);
      return claudePath;
    } else {
      console.error("❌ Claude CLI found but not working properly");
      console.error(
        "   Please reinstall claude-code or check your installation",
      );
      console.error(`   Exit code: ${versionResult.code}`);
      console.error(`   Error details: ${versionResult.stderr}`);
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
