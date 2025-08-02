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

  it("should execute commands", async () => {
    const result = await runtime.runCommand("echo", ["test"]);
    expect(typeof result.success).toBe("boolean");
    expect(typeof result.stdout).toBe("string");
  });
});
