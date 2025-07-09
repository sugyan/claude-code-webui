/**
 * Shared CLI validation utilities
 *
 * Common validation functions used across different runtime CLI entry points.
 */

import type { Runtime } from "../runtime/types.ts";

/**
 * Validates that the Claude CLI is available and working
 */
export async function validateClaudeCli(runtime: Runtime): Promise<void> {
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
