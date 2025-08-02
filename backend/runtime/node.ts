/**
 * Node.js runtime implementation
 *
 * Simplified implementation focusing only on platform-specific operations.
 */

import { spawn, type SpawnOptions } from "node:child_process";
import process from "node:process";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { CommandResult, Runtime } from "./types.ts";
import type { MiddlewareHandler } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { getPlatform } from "../utils/os.ts";

export class NodeRuntime implements Runtime {
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

  runCommand(
    command: string,
    args: string[],
    options?: { env?: Record<string, string> },
  ): Promise<CommandResult> {
    return new Promise((resolve) => {
      const isWindows = getPlatform() === "windows";
      const spawnOptions: SpawnOptions = {
        stdio: ["ignore", "pipe", "pipe"],
        env: options?.env ? { ...process.env, ...options.env } : process.env,
      };

      // On Windows, always use cmd.exe /c for all commands
      let actualCommand = command;
      let actualArgs = args;

      if (isWindows) {
        actualCommand = "cmd.exe";
        actualArgs = ["/c", command, ...args];
      }

      const child = spawn(actualCommand, actualArgs, spawnOptions);

      const textDecoder = new TextDecoder();
      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data: Uint8Array) => {
        stdout += textDecoder.decode(data, { stream: true });
      });

      child.stderr?.on("data", (data: Uint8Array) => {
        stderr += textDecoder.decode(data, { stream: true });
      });

      child.on("close", (code: number | null) => {
        resolve({
          success: code === 0,
          code: code ?? 1,
          stdout,
          stderr,
        });
      });

      child.on("error", (error: Error) => {
        resolve({
          success: false,
          code: 1,
          stdout: "",
          stderr: error.message,
        });
      });
    });
  }

  serve(
    port: number,
    hostname: string,
    handler: (req: Request) => Response | Promise<Response>,
  ): void {
    // Use Hono with Node.js server to handle Web API Request/Response
    const app = new Hono();

    // Route all requests to the provided handler
    app.all("*", async (c) => {
      const response = await handler(c.req.raw);
      return response;
    });

    // Start the server using @hono/node-server
    serve({
      fetch: app.fetch,
      port,
      hostname,
    });

    console.log(`Listening on http://${hostname}:${port}/`);
  }

  createStaticFileMiddleware(options: { root: string }): MiddlewareHandler {
    return serveStatic(options);
  }
}
