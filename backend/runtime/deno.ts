/**
 * Deno runtime implementation
 *
 * Simple, minimal implementation of the Runtime interface for Deno.
 */

import type { CommandResult, Runtime } from "./types.ts";

export class DenoRuntime implements Runtime {
  async readTextFile(path: string): Promise<string> {
    return await Deno.readTextFile(path);
  }

  async readBinaryFile(path: string): Promise<Uint8Array> {
    return await Deno.readFile(path);
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
