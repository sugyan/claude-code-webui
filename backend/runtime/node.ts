/**
 * Node.js runtime implementation
 *
 * Implementation of the Runtime interface using Node.js APIs.
 * Provides equivalent functionality to the Deno runtime for cross-platform support.
 */

import {
  constants as fsConstants,
  lstatSync,
  promises as fs,
  readFileSync,
} from "node:fs";
import { spawn } from "node:child_process";
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

  readTextFileSync(path: string): string {
    return readFileSync(path, "utf8");
  }

  async readBinaryFile(path: string): Promise<Uint8Array> {
    const buffer = await fs.readFile(path);
    return new Uint8Array(buffer);
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

  async lstat(path: string): Promise<FileStats> {
    const stats = await fs.lstat(path);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      isSymlink: stats.isSymbolicLink(),
      size: stats.size,
      mtime: stats.mtime,
    };
  }

  lstatSync(path: string): FileStats {
    const stats = lstatSync(path);
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
    const platform = this.getPlatform();

    if (platform === "windows") {
      // Windows: Try USERPROFILE first, then HOMEDRIVE+HOMEPATH
      const userProfile = process.env.USERPROFILE;
      if (userProfile) {
        return userProfile;
      }

      const homeDrive = process.env.HOMEDRIVE;
      const homePath = process.env.HOMEPATH;
      if (homeDrive && homePath) {
        return `${homeDrive}${homePath}`;
      }

      return undefined;
    } else {
      // Unix-like systems: Use HOME
      return process.env.HOME;
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

  runCommand(command: string, args: string[]): Promise<CommandResult> {
    return new Promise((resolve) => {
      // Windows-specific spawn options
      const isWindows = this.getPlatform() === "windows";
      const spawnOptions: any = {
        stdio: ["ignore", "pipe", "pipe"],
      };

      // For Windows .cmd files, use cmd.exe /c for proper execution
      let actualCommand = command;
      let actualArgs = args;

      if (isWindows && command.endsWith(".cmd")) {
        actualCommand = "cmd.exe";
        actualArgs = ["/c", command, ...args];
      } else if (isWindows) {
        // Enable shell on Windows for other cases
        spawnOptions.shell = true;
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
