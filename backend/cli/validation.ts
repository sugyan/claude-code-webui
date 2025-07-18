/**
 * Shared CLI validation utilities
 *
 * Common validation functions used across different runtime CLI entry points.
 */

import type { Runtime } from "../runtime/types.ts";

/**
 * Detects the actual Claude script path by tracing node execution
 * Uses a temporary node wrapper to capture the actual script path being executed by Claude CLI
 * @param runtime - Runtime abstraction for system operations
 * @param claudePath - Path to the claude executable
 * @returns Promise<string> - The actual Claude script path or empty string if detection fails
 */
export async function detectClaudeCliPath(
  runtime: Runtime,
  claudePath: string,
): Promise<string> {
  const platform = runtime.getPlatform();

  try {
    return await runtime.withTempDir(async (tempDir) => {
      const traceFile = `${tempDir}/trace.log`;

      // Find the original node executable
      const nodeExecutables = await runtime.findExecutable("node");
      if (nodeExecutables.length === 0) {
        // Silently return empty string - this is not a critical error
        return "";
      }

      const originalNodePath = nodeExecutables[0];

      // Create platform-specific wrapper script
      const wrapperFileName = platform === "windows" ? "node.bat" : "node";
      const wrapperScript =
        platform === "windows"
          ? `@echo off\necho %* >> "${traceFile}"\n"${originalNodePath}" %*`
          : `#!/bin/bash\necho "$@" >> "${traceFile}"\nexec "${originalNodePath}" "$@"`;

      await runtime.writeTextFile(
        `${tempDir}/${wrapperFileName}`,
        wrapperScript,
        platform === "windows" ? undefined : { mode: 0o755 },
      );

      // Execute claude with modified PATH to intercept node calls
      const currentPath = runtime.getEnv("PATH") || "";
      const modifiedPath =
        platform === "windows"
          ? `${tempDir};${currentPath}`
          : `${tempDir}:${currentPath}`;

      const executionResult = await runtime.runCommand(
        claudePath,
        ["--version"],
        {
          env: { PATH: modifiedPath },
        },
      );

      // Verify command executed successfully
      if (!executionResult.success) {
        return "";
      }

      // Parse trace file to extract script path
      let traceContent: string;
      try {
        traceContent = await runtime.readTextFile(traceFile);
      } catch {
        // Trace file might not exist or be readable
        return "";
      }

      if (!traceContent.trim()) {
        // Empty trace file indicates no node execution was captured
        return "";
      }

      const traceLines = traceContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // Find the Claude script path from traced node executions
      for (const traceLine of traceLines) {
        const commandArguments = traceLine.split(" ");
        if (commandArguments.length > 0) {
          const scriptPath = commandArguments[0];
          if (scriptPath) {
            return scriptPath;
          }
        }
      }

      // No Claude script path found in trace
      return "";
    });
  } catch (error) {
    // Log error for debugging but don't crash the application
    console.error(
      `Failed to detect Claude CLI path: ${error instanceof Error ? error.message : String(error)}`,
    );
    return "";
  }
}

/**
 * Validates that the Claude CLI is available and detects the actual CLI script path
 * Uses detectClaudeCliPath for universal path detection regardless of installation method
 * Exits process if Claude CLI is not found or not working
 * @param runtime - Runtime abstraction for system operations
 * @param customPath - Optional custom path to claude executable to validate
 * @returns Promise<string> - The detected actual CLI script path or validated claude path
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

      // Use the first candidate (most likely to be the correct one)
      claudePath = candidates[0];
    }

    // Detect the actual CLI script path using tracing approach
    console.log("🔍 Detecting actual Claude CLI script path...");
    const detectedCliPath = await detectClaudeCliPath(runtime, claudePath);

    if (detectedCliPath) {
      console.log(`✅ Claude CLI script detected: ${detectedCliPath}`);
      return detectedCliPath;
    } else {
      // Fallback to the original path if detection fails
      console.log(
        `⚠️  CLI script detection failed, using original path: ${claudePath}`,
      );
      return claudePath;
    }
  } catch (error) {
    console.error("❌ Failed to validate Claude CLI");
    console.error(
      `   Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    runtime.exit(1);
  }
}
