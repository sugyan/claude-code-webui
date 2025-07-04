/**
 * Minimal runtime abstraction layer
 *
 * Simple interfaces for abstracting runtime-specific operations
 * that are used in the backend application.
 */

// Command execution result
export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number;
}

// Main runtime interface - minimal and focused
export interface Runtime {
  // File operations
  readTextFile(path: string): Promise<string>;
  readBinaryFile(path: string): Promise<Uint8Array>;

  // Environment access
  getEnv(key: string): string | undefined;
  getArgs(): string[];
  exit(code: number): never;

  // Process execution
  runCommand(command: string, args: string[]): Promise<CommandResult>;

  // HTTP server
  serve(
    port: number,
    hostname: string,
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
}
