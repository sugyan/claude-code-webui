/**
 * Deno runtime implementation
 *
 * Simplified implementation focusing only on platform-specific operations.
 */

import type { CommandResult, Runtime } from "./types.ts";
import type { MiddlewareHandler } from "hono";
import { serveStatic } from "hono/deno";
import { getPlatform } from "../utils/os.ts";

export class DenoRuntime implements Runtime {
  async findExecutable(name: string): Promise<string[]> {
    const platform = getPlatform();
    const candidates: string[] = [];

    if (platform === "windows") {
      // Try multiple possible executable names on Windows
      const executableNames = [
        name,
        `${name}.exe`,
        `${name}.cmd`,
        `${name}.bat`,
      ];

      for (const execName of executableNames) {
        const result = await this.runCommand("where", [execName]);
        if (result.success && result.stdout.trim()) {
          // where command can return multiple paths, split by newlines
          const paths = result.stdout
            .trim()
            .split("\n")
            .map((p) => p.trim())
            .filter((p) => p);
          candidates.push(...paths);
        }
      }
    } else {
      // Unix-like systems (macOS, Linux)
      const result = await this.runCommand("which", [name]);
      if (result.success && result.stdout.trim()) {
        candidates.push(result.stdout.trim());
      }
    }

    return candidates;
  }

  async runCommand(
    command: string,
    args: string[],
    options?: { env?: Record<string, string> },
  ): Promise<CommandResult> {
    const platform = getPlatform();

    // On Windows, always use cmd.exe /c for all commands
    let actualCommand = command;
    let actualArgs = args;

    if (platform === "windows") {
      actualCommand = "cmd.exe";
      actualArgs = ["/c", command, ...args];
    }

    const cmd = new Deno.Command(actualCommand, {
      args: actualArgs,
      stdout: "piped",
      stderr: "piped",
      env: options?.env,
    });

    const result = await cmd.output();

    return {
      success: result.success,
      code: result.code,
      stdout: new TextDecoder().decode(result.stdout),
      stderr: new TextDecoder().decode(result.stderr),
    };
  }

  serve(
    port: number,
    hostname: string,
    handler: (req: Request) => Response | Promise<Response>,
  ): void {
    Deno.serve({ port, hostname }, handler);
  }

  createStaticFileMiddleware(options: { root: string }): MiddlewareHandler {
    return serveStatic(options);
  }
}
