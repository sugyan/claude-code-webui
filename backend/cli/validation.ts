/**
 * Shared CLI validation utilities
 *
 * Common validation functions used across different runtime CLI entry points.
 */

import type { Runtime } from "../runtime/types.ts";

// Regex to fix double backslashes that might occur during Windows path string processing
const DOUBLE_BACKSLASH_REGEX = /\\\\/g;

/**
 * Parses Windows .cmd script to extract the actual CLI script path
 * Handles NPM standard template that uses "%~dp0\cli.js" pattern
 * @param runtime - Runtime abstraction for system operations
 * @param cmdPath - Path to the .cmd file to parse
 * @returns Promise<string | null> - The extracted CLI script path or null if parsing fails
 */
async function parseCmdScript(
  runtime: Runtime,
  cmdPath: string,
): Promise<string | null> {
  try {
    console.debug(`[DEBUG] Parsing Windows .cmd script: ${cmdPath}`);
    const cmdContent = await runtime.readTextFile(cmdPath);

    // Extract directory of the .cmd file for resolving relative paths
    const cmdDir = cmdPath.substring(
      0,
      cmdPath.lastIndexOf("\\") || cmdPath.lastIndexOf("/"),
    );

    // Match NPM standard template pattern: "%~dp0\cli.js" or "%~dp0\path\to\file.js"
    const match = cmdContent.match(/"%~dp0\\([^"]+\.js)"/);
    if (match) {
      const relativePath = match[1];
      const absolutePath = `${cmdDir}\\${relativePath}`;

      console.debug(`[DEBUG] Found CLI script reference: ${relativePath}`);
      console.debug(`[DEBUG] Resolved absolute path: ${absolutePath}`);

      // Verify the resolved path exists
      if (await runtime.exists(absolutePath)) {
        console.debug(`[DEBUG] .cmd parsing successful: ${absolutePath}`);
        return absolutePath;
      } else {
        console.debug(`[DEBUG] Resolved path does not exist: ${absolutePath}`);
      }
    } else {
      console.debug(`[DEBUG] No CLI script pattern found in .cmd content`);
    }

    return null;
  } catch (error) {
    console.debug(
      `[DEBUG] Failed to parse .cmd script: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Generates Windows batch wrapper script
 * @param traceFile - Path to trace output file
 * @param nodePath - Path to original node executable
 * @returns Windows batch script content
 */
function getWindowsWrapperScript(traceFile: string, nodePath: string): string {
  return `@echo off\necho %~1 >> "${traceFile}"\n"${nodePath}" %*`;
}

/**
 * Generates Unix shell wrapper script
 * @param traceFile - Path to trace output file
 * @param nodePath - Path to original node executable
 * @returns Unix shell script content
 */
function getUnixWrapperScript(traceFile: string, nodePath: string): string {
  return `#!/bin/bash\necho "$1" >> "${traceFile}"\nexec "${nodePath}" "$@"`;
}

/**
 * Detects the actual Claude script path by tracing node execution
 * Uses a temporary node wrapper to capture the actual script path being executed by Claude CLI
 * @param runtime - Runtime abstraction for system operations
 * @param claudePath - Path to the claude executable
 * @returns Promise<{scriptPath: string, versionOutput: string}> - The actual Claude script path and version output, or empty strings if detection fails
 */
export async function detectClaudeCliPath(
  runtime: Runtime,
  claudePath: string,
): Promise<{ scriptPath: string; versionOutput: string }> {
  const platform = runtime.getPlatform();
  const isWindows = platform === "windows";

  // First try PATH wrapping method
  let pathWrappingResult: { scriptPath: string; versionOutput: string } | null =
    null;

  try {
    pathWrappingResult = await runtime.withTempDir(async (tempDir) => {
      const traceFile = `${tempDir}/trace.log`;

      // Find the original node executable
      const nodeExecutables = await runtime.findExecutable("node");
      if (nodeExecutables.length === 0) {
        // Silently return null - this is not a critical error
        return null;
      }

      const originalNodePath = nodeExecutables[0];

      // Create platform-specific wrapper script
      const wrapperFileName = isWindows ? "node.bat" : "node";
      const wrapperScript = isWindows
        ? getWindowsWrapperScript(traceFile, originalNodePath)
        : getUnixWrapperScript(traceFile, originalNodePath);

      await runtime.writeTextFile(
        `${tempDir}/${wrapperFileName}`,
        wrapperScript,
        isWindows ? undefined : { mode: 0o755 },
      );

      // Execute claude with modified PATH to intercept node calls
      const currentPath = runtime.getEnv("PATH") || "";
      const modifiedPath = isWindows
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
        return null;
      }

      const versionOutput = executionResult.stdout.trim();

      // Parse trace file to extract script path
      let traceContent: string;
      try {
        traceContent = await runtime.readTextFile(traceFile);
      } catch {
        // Trace file might not exist or be readable
        return { scriptPath: "", versionOutput };
      }

      if (!traceContent.trim()) {
        // Empty trace file indicates no node execution was captured
        return { scriptPath: "", versionOutput };
      }

      const traceLines = traceContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // Find the Claude script path from traced node executions
      for (const traceLine of traceLines) {
        let scriptPath = traceLine.trim();

        // Clean up the script path
        if (scriptPath) {
          // Fix double backslashes that might occur during string processing
          if (isWindows) {
            scriptPath = scriptPath.replace(DOUBLE_BACKSLASH_REGEX, "\\");
          }
        }

        if (scriptPath) {
          return { scriptPath, versionOutput };
        }
      }

      // No Claude script path found in trace
      return { scriptPath: "", versionOutput };
    });
  } catch (error) {
    // Log error for debugging but don't crash the application
    console.debug(
      `[DEBUG] PATH wrapping detection failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    pathWrappingResult = null;
  }

  // If PATH wrapping succeeded, return the result
  if (pathWrappingResult && pathWrappingResult.scriptPath) {
    return pathWrappingResult;
  }

  // Try Windows .cmd parsing fallback if PATH wrapping didn't work
  if (isWindows && claudePath.endsWith(".cmd")) {
    console.debug(
      "[DEBUG] PATH wrapping method failed, trying .cmd parsing fallback...",
    );
    try {
      const cmdParsedPath = await parseCmdScript(runtime, claudePath);
      if (cmdParsedPath) {
        // Get version output, use from PATH wrapping if available
        let versionOutput = pathWrappingResult?.versionOutput || "";
        if (!versionOutput) {
          try {
            const versionResult = await runtime.runCommand(claudePath, [
              "--version",
            ]);
            if (versionResult.success) {
              versionOutput = versionResult.stdout.trim();
            }
          } catch {
            // Ignore version detection errors
          }
        }
        return { scriptPath: cmdParsedPath, versionOutput };
      }
    } catch (fallbackError) {
      console.debug(
        `[DEBUG] .cmd parsing fallback failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
      );
    }
  }

  // Both methods failed, return empty result but preserve version output if available
  return {
    scriptPath: "",
    versionOutput: pathWrappingResult?.versionOutput || "",
  };
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
      console.debug(
        `[DEBUG] Found Claude CLI candidates: ${candidates.join(", ")}`,
      );
      console.debug(`[DEBUG] Using Claude CLI path: ${claudePath}`);
    }

    // Check if this is a Windows .cmd file for enhanced debugging
    const platform = runtime.getPlatform();
    const isWindows = platform === "windows";
    const isCmdFile = claudePath.endsWith(".cmd");

    if (isWindows && isCmdFile) {
      console.debug(
        "[DEBUG] Detected Windows .cmd file - fallback parsing available if needed",
      );
    }

    // Detect the actual CLI script path using tracing approach
    console.log("🔍 Detecting actual Claude CLI script path...");
    const detection = await detectClaudeCliPath(runtime, claudePath);

    if (detection.scriptPath) {
      console.log(`✅ Claude CLI script detected: ${detection.scriptPath}`);
      if (detection.versionOutput) {
        console.log(`✅ Claude CLI found: ${detection.versionOutput}`);
      }
      return detection.scriptPath;
    } else {
      // Fallback to the original path if detection fails
      console.log(
        `⚠️  CLI script detection failed, using original path: ${claudePath}`,
      );
      if (detection.versionOutput) {
        console.log(`✅ Claude CLI found: ${detection.versionOutput}`);
      }
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
