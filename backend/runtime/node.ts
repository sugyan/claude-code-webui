/**
 * Node.js runtime implementation
 *
 * Implementation of the Runtime interface using Node.js APIs.
 * Provides equivalent functionality to the Deno runtime for cross-platform support.
 */

import { constants as fsConstants, promises as fs } from "node:fs";
import { spawn, type SpawnOptions } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type {
  CommandResult,
  DirectoryEntry,
  FileStats,
  Runtime,
} from "./types.ts";
import type { MiddlewareHandler } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";

export class NodeRuntime implements Runtime {
  async readTextFile(path: string): Promise<string> {
    return await fs.readFile(path, "utf8");
  }

  async readBinaryFile(path: string): Promise<Uint8Array> {
    const buffer = await fs.readFile(path);
    return new Uint8Array(buffer);
  }

  async writeTextFile(
    path: string,
    content: string,
    options?: { mode?: number },
  ): Promise<void> {
    await fs.writeFile(path, content, "utf8");
    if (options?.mode !== undefined) {
      await fs.chmod(path, options.mode);
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path, fsConstants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async stat(path: string): Promise<FileStats> {
    const stats = await fs.stat(path);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      isSymlink: stats.isSymbolicLink(),
      size: stats.size,
      mtime: stats.mtime,
    };
  }

  async *readDir(path: string): AsyncIterable<DirectoryEntry> {
    const entries = await fs.readdir(path, { withFileTypes: true });
    for (const entry of entries) {
      yield {
        name: entry.name,
        isFile: entry.isFile(),
        isDirectory: entry.isDirectory(),
        isSymlink: entry.isSymbolicLink(),
      };
    }
  }

  async withTempDir<T>(callback: (tempDir: string) => Promise<T>): Promise<T> {
    const tempDir = await fs.mkdtemp(join(tmpdir(), "claude-webui-temp-"));
    try {
      return await callback(tempDir);
    } finally {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Silently ignore cleanup errors - temp dir will be cleaned up by OS eventually
      }
    }
  }

  getEnv(key: string): string | undefined {
    return process.env[key];
  }

  getArgs(): string[] {
    // Remove 'node' and script path from process.argv
    return process.argv.slice(2);
  }

  getPlatform(): "windows" | "darwin" | "linux" {
    switch (process.platform) {
      case "win32":
        return "windows";
      case "darwin":
        return "darwin";
      case "linux":
        return "linux";
      default:
        // Default to linux for unknown platforms
        return "linux";
    }
  }

  getHomeDir(): string | undefined {
    try {
      return homedir();
    } catch {
      // Fallback to undefined if os.homedir() fails
      return undefined;
    }
  }

  exit(code: number): never {
    process.exit(code);
  }

  async findExecutable(name: string): Promise<string[]> {
    const platform = this.getPlatform();
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
      const isWindows = this.getPlatform() === "windows";
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
