/**
 * Node.js Runtime Basic Functionality Test
 *
 * Simple test to verify that the NodeRuntime implementation
 * works correctly in a Node.js environment.
 */

import { describe, it, expect } from "vitest";
import { NodeRuntime } from "../../runtime/node.js";

describe("Node.js Runtime", () => {
  const runtime = new NodeRuntime();

  it("should implement all required interface methods", () => {
    const requiredMethods = [
      "readTextFile",
      "readBinaryFile",
      "exists",
      "stat",
      "lstat",
      "lstatSync",
      "readDir",
      "getEnv",
      "getArgs",
      "exit",
      "runCommand",
      "serve",
    ];

    for (const method of requiredMethods) {
      expect(
        typeof (runtime as unknown as Record<string, unknown>)[method],
      ).toBe("function");
    }
  });

  it("should access environment variables", () => {
    const path = runtime.getEnv("PATH");
    expect(typeof path).toBe("string");
    expect(path!.length).toBeGreaterThan(0);
  });

  it("should return command line arguments as array", () => {
    const args = runtime.getArgs();
    expect(Array.isArray(args)).toBe(true);
  });

  it("should check file existence", async () => {
    const exists = await runtime.exists("package.json");
    expect(exists).toBe(true);
  });

  it("should read files asynchronously", async () => {
    const content = await runtime.readTextFile("package.json");
    expect(typeof content).toBe("string");
    expect(content.length).toBeGreaterThan(0);

    // Verify it's actually JSON
    const parsed = JSON.parse(content);
    expect(parsed.name).toBe("claude-code-webui");
  });

  it("should execute commands", async () => {
    const result = await runtime.runCommand("echo", ["test"]);
    expect(typeof result.success).toBe("boolean");
    expect(typeof result.stdout).toBe("string");
  });
});
