/**
 * Shared CLI validation utilities
 *
 * Common validation functions used across different runtime CLI entry points.
 */

import type { Runtime } from "../runtime/types.ts";

/**
 * Detects if a file is an asdf shim by checking for the asdf exec pattern
 * @param runtime - Runtime abstraction for system operations
 * @param filePath - Path to the file to check
 * @returns boolean - True if file is an asdf shim
 */
async function isAsdfShim(
  runtime: Runtime,
  filePath: string,
): Promise<boolean> {
  try {
    const content = await runtime.readTextFile(filePath);
    return content.includes("asdf exec");
  } catch {
    return false;
  }
}

/**
 * Resolves the actual executable path for asdf shims
 * @param runtime - Runtime abstraction for system operations
 * @param command - The command name (e.g., "claude")
 * @returns Promise<string> - The resolved path to the actual executable
 */
async function resolveAsdfExecutablePath(
  runtime: Runtime,
  command: string,
): Promise<string> {
  const asdfWhichResult = await runtime.runCommand("asdf", ["which", command]);

  if (!asdfWhichResult.success || !asdfWhichResult.stdout.trim()) {
    throw new Error(`Failed to resolve asdf executable for ${command}`);
  }

  return asdfWhichResult.stdout.trim();
}

/**
 * Extracts actual executable path from bash script
 * Parses 'exec "path"' pattern from migrate-installer wrapper scripts
 * @param runtime - Runtime abstraction for system operations
 * @param scriptPath - Path to the script file
 * @returns string - The extracted executable path or original path if no match
 */
async function resolveWrapperScript(
  runtime: Runtime,
  scriptPath: string,
): Promise<string> {
  try {
    const content = await runtime.readTextFile(scriptPath);
    const match = content.match(/exec\s+"([^"]+)"/);
    return match ? match[1] : scriptPath;
  } catch {
    return scriptPath;
  }
}

/**
 * Resolves symlinks and wrapper scripts to actual executable paths
 * @param runtime - Runtime abstraction for system operations
 * @param claudePath - Initial path to resolve
 * @returns string - The resolved actual executable path
 */
async function resolveExecutablePath(
  runtime: Runtime,
  claudePath: string,
): Promise<string> {
  // Handle symlinks (typical npm install: /usr/local/bin/claude -> node_modules/.bin/claude)
  try {
    const stat = runtime.lstatSync(claudePath);
    if (stat.isSymlink) {
      // Node.js resolves symlinks automatically when executing, so we can use the symlink path
      return claudePath;
    }
  } catch {
    // Silently continue if stat check fails
  }

  // Handle shell scripts (migrate-installer: extract actual executable path)
  return await resolveWrapperScript(runtime, claudePath);
}

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
 * Validates that the Claude CLI is available and working
 * Uses platform-specific command (`which` on Unix, `where` on Windows) for PATH detection
 * Resolves asdf shims to actual executable paths for SDK compatibility
 * Exits process if Claude CLI is not found or not working
 * @param runtime - Runtime abstraction for system operations
 * @param customPath - Optional custom path to claude executable to validate
 * @returns Promise<string> - The validated path to claude executable (resolved from shims)
 */
export async function validateClaudeCli(
  runtime: Runtime,
  customPath?: string,
): Promise<string> {
  try {
    let claudePath = "";
    const platform = runtime.getPlatform();

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

    // Resolve all types of wrappers to actual executable paths
    if (platform !== "windows") {
      // Check if the path is an asdf shim and resolve to actual executable (Unix-like systems only)
      if (await isAsdfShim(runtime, claudePath)) {
        console.log(`🔍 Detected asdf shim: ${claudePath}`);
        try {
          const resolvedPath = await resolveAsdfExecutablePath(
            runtime,
            "claude",
          );
          console.log(`📍 Resolved to actual executable: ${resolvedPath}`);
          claudePath = resolvedPath;
        } catch (error) {
          console.error("❌ Failed to resolve asdf executable path");
          console.error(
            `   Error: ${error instanceof Error ? error.message : String(error)}`,
          );
          console.error(
            "   Make sure claude is installed through asdf and properly configured",
          );
          runtime.exit(1);
        }
      } else {
        // Resolve symlinks and wrapper scripts
        claudePath = await resolveExecutablePath(runtime, claudePath);
      }
    } else {
      // Windows: resolve symlinks and wrapper scripts
      claudePath = await resolveExecutablePath(runtime, claudePath);
    }

    // Final validation: verify the resolved path works
    // For custom paths: needed because original path wasn't tested
    // For auto-detected paths: needed because path may have been resolved/changed
    const versionResult = await runtime.runCommand(claudePath, ["--version"]);
    if (versionResult.success) {
      console.log(`✅ Claude CLI found: ${versionResult.stdout.trim()}`);
      console.log(`   Path: ${claudePath}`);
      return claudePath;
    } else {
      const pathType = customPath ? "Custom" : "Auto-detected";
      console.error(`❌ ${pathType} Claude path not working after resolution`);
      console.error(
        "   Please check your installation or try a different path",
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
