/**
 * Node.js Runtime Basic Functionality Test
 *
 * Simple test to verify that the NodeRuntime implementation
 * works correctly in a Node.js environment.
 */

import { describe, it, expect } from "vitest";
import { NodeRuntime } from "../../runtime/node.js";
import { readTextFile, exists } from "../../utils/fs.js";
import { getEnv, getArgs } from "../../utils/os.js";

describe("Node.js Runtime", () => {
  const runtime = new NodeRuntime();

  it("should implement all required interface methods", () => {
    const requiredMethods = [
      "findExecutable",
      "runCommand",
      "serve",
      "createStaticFileMiddleware",
    ];

    for (const method of requiredMethods) {
      expect(
        typeof (runtime as unknown as Record<string, unknown>)[method],
      ).toBe("function");
    }
  });

  it("should access environment variables via shared utilities", () => {
    const path = getEnv("PATH");
    expect(typeof path).toBe("string");
    expect(path!.length).toBeGreaterThan(0);
  });

  it("should return command line arguments as array via shared utilities", () => {
    const args = getArgs();
    expect(Array.isArray(args)).toBe(true);
  });

  it("should check file existence via shared utilities", async () => {
    const fileExists = await exists("package.json");
    expect(fileExists).toBe(true);
  });

  it("should read files asynchronously via shared utilities", async () => {
    const content = await readTextFile("package.json");
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
