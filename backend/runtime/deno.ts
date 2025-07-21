/**
 * Deno runtime implementation
 *
 * Simple, minimal implementation of the Runtime interface for Deno.
 */

import type {
  CommandResult,
  DirectoryEntry,
  FileStats,
  Runtime,
} from "./types.ts";
import type { MiddlewareHandler } from "hono";
import { serveStatic } from "hono/deno";

export class DenoRuntime implements Runtime {
  async readTextFile(path: string): Promise<string> {
    return await Deno.readTextFile(path);
  }

  async readBinaryFile(path: string): Promise<Uint8Array> {
    return await Deno.readFile(path);
  }

  async writeTextFile(
    path: string,
    content: string,
    options?: { mode?: number },
  ): Promise<void> {
    await Deno.writeTextFile(path, content);
    if (options?.mode !== undefined) {
      await Deno.chmod(path, options.mode);
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await Deno.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  async stat(path: string): Promise<FileStats> {
    const info = await Deno.stat(path);
    return {
      isFile: info.isFile,
      isDirectory: info.isDirectory,
      isSymlink: info.isSymlink,
      size: info.size,
      mtime: info.mtime,
    };
  }

  async *readDir(path: string): AsyncIterable<DirectoryEntry> {
    for await (const entry of Deno.readDir(path)) {
      yield {
        name: entry.name,
        isFile: entry.isFile,
        isDirectory: entry.isDirectory,
        isSymlink: entry.isSymlink,
      };
    }
  }

  async withTempDir<T>(callback: (tempDir: string) => Promise<T>): Promise<T> {
    const tempDir = await Deno.makeTempDir();
    try {
      return await callback(tempDir);
    } finally {
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch {
        // Silently ignore cleanup errors - temp dir will be cleaned up by OS eventually
      }
    }
  }

  getEnv(key: string): string | undefined {
    return Deno.env.get(key);
  }

  getArgs(): string[] {
    return Deno.args;
  }

  getPlatform(): "windows" | "darwin" | "linux" {
    switch (Deno.build.os) {
      case "windows":
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
      // Deno provides os.homedir() equivalent
      return (
        Deno.env.get("HOME") ||
        Deno.env.get("USERPROFILE") ||
        (Deno.env.get("HOMEDRIVE") && Deno.env.get("HOMEPATH")
          ? `${Deno.env.get("HOMEDRIVE")}${Deno.env.get("HOMEPATH")}`
          : undefined)
      );
    } catch {
      return undefined;
    }
  }

  exit(code: number): never {
    Deno.exit(code);
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

  async runCommand(
    command: string,
    args: string[],
    options?: { env?: Record<string, string> },
  ): Promise<CommandResult> {
    const platform = this.getPlatform();

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
