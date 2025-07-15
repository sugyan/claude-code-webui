/**
 * Minimal runtime abstraction layer
 *
 * Simple interfaces for abstracting runtime-specific operations
 * that are used in the backend application.
 */

import type { MiddlewareHandler } from "hono";

// Command execution result
export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number;
}

// File system information
export interface FileStats {
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
  size: number;
  mtime: Date | null;
}

// Directory entry information
export interface DirectoryEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
}

// Main runtime interface - minimal and focused
export interface Runtime {
  // File operations
  readTextFile(path: string): Promise<string>;
  readBinaryFile(path: string): Promise<Uint8Array>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<FileStats>;
  lstat(path: string): Promise<FileStats>;
  lstatSync(path: string): FileStats;
  readDir(path: string): AsyncIterable<DirectoryEntry>;

  // Environment access
  getEnv(key: string): string | undefined;
  getArgs(): string[];
  getPlatform(): "windows" | "darwin" | "linux";
  getHomeDir(): string | undefined;
  exit(code: number): never;

  // Process execution
  runCommand(command: string, args: string[]): Promise<CommandResult>;
  findExecutable(name: string): Promise<string[]>;

  // HTTP server
  serve(
    port: number,
    hostname: string,
    handler: (req: Request) => Response | Promise<Response>,
  ): void;

  // Static file serving
  createStaticFileMiddleware(options: { root: string }): MiddlewareHandler;
}
