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

export class DenoRuntime implements Runtime {
  async readTextFile(path: string): Promise<string> {
    return await Deno.readTextFile(path);
  }

  readTextFileSync(path: string): string {
    return Deno.readTextFileSync(path);
  }

  async readBinaryFile(path: string): Promise<Uint8Array> {
    return await Deno.readFile(path);
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

  async lstat(path: string): Promise<FileStats> {
    const info = await Deno.lstat(path);
    return {
      isFile: info.isFile,
      isDirectory: info.isDirectory,
      isSymlink: info.isSymlink,
      size: info.size,
      mtime: info.mtime,
    };
  }

  lstatSync(path: string): FileStats {
    const info = Deno.lstatSync(path);
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

  getEnv(key: string): string | undefined {
    return Deno.env.get(key);
  }

  getArgs(): string[] {
    return Deno.args;
  }

  exit(code: number): never {
    Deno.exit(code);
  }

  async runCommand(command: string, args: string[]): Promise<CommandResult> {
    const cmd = new Deno.Command(command, {
      args,
      stdout: "piped",
      stderr: "piped",
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
}
