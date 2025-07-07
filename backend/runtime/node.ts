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
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import type {
  CommandResult,
  DirectoryEntry,
  FileStats,
  Runtime,
} from "./types.ts";

// Node.js global types for Deno environment
declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  exit(code: number): never;
};

interface BufferConstructor {
  concat(chunks: Uint8Array[]): Uint8Array;
}

declare const Buffer: BufferConstructor;

interface BufferLike {
  toString(): string;
}

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

  exit(code: number): never {
    process.exit(code);
  }

  runCommand(command: string, args: string[]): Promise<CommandResult> {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data: BufferLike) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data: BufferLike) => {
        stderr += data.toString();
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
    // Basic HTTP server implementation for Node.js
    // This is a placeholder implementation that will be enhanced
    // when static file serving abstraction is implemented (Issue #128)
    const server = createServer(
      async (req: IncomingMessage, res: ServerResponse) => {
        try {
          // Convert Node.js request to Web API Request
          const url = `http://${req.headers.host}${req.url}`;
          const method = req.method || "GET";

          // Handle request body for POST requests
          let body: string | undefined;
          if (method !== "GET" && method !== "HEAD") {
            const chunks: Uint8Array[] = [];
            for await (const chunk of req) {
              chunks.push(chunk as Uint8Array);
            }
            body = Buffer.concat(chunks).toString();
          }

          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === "string") {
              headers[key] = value;
            } else if (Array.isArray(value)) {
              headers[key] = value.join(", ");
            }
          }

          const request = new Request(url, {
            method,
            headers,
            body: body ? body : undefined,
          });

          // Call the handler
          const response = await handler(request);

          // Convert Web API Response to Node.js response
          res.statusCode = response.status;

          // Set headers
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          // Send response body
          if (response.body) {
            const reader = response.body.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
            } finally {
              reader.releaseLock();
            }
          }
          res.end();
        } catch (error) {
          console.error("Error handling request:", error);
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      },
    );

    server.listen(port, hostname, () => {
      console.log(`Node.js server listening on ${hostname}:${port}`);
    });
  }
}
