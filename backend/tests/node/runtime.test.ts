/**
 * Node.js Runtime Basic Functionality Test
 *
 * Simple test to verify that the NodeRuntime implementation
 * works correctly in a Node.js environment.
 */

import process from "node:process";
import { NodeRuntime } from "../../runtime/node.ts";

async function runTests() {
  console.log("🧪 Starting Node.js Runtime Tests...\n");

  const runtime = new NodeRuntime();
  let passedTests = 0;
  let totalTests = 0;

  // Helper function to run individual tests
  async function test(name: string, testFn: () => Promise<void> | void) {
    totalTests++;
    try {
      await testFn();
      console.log(`✅ ${name}`);
      passedTests++;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.log(`❌ ${name}: ${errorMessage}`);
    }
  }

  // Test 1: Interface implementation
  await test("Runtime interface implementation", () => {
    const requiredMethods = [
      "readTextFile",
      "readTextFileSync",
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
      if (
        typeof (runtime as unknown as Record<string, unknown>)[method] !==
          "function"
      ) {
        throw new Error(`Missing method: ${method}`);
      }
    }
  });

  // Test 2: Environment variable access
  await test("Environment variable access", () => {
    const path = runtime.getEnv("PATH");
    if (typeof path !== "string" || path.length === 0) {
      throw new Error("PATH environment variable should be accessible");
    }
  });

  // Test 3: Command line arguments
  await test("Command line arguments", () => {
    const args = runtime.getArgs();
    if (!Array.isArray(args)) {
      throw new Error("getArgs should return an array");
    }
  });

  // Test 4: File existence check
  await test("File existence check", async () => {
    const exists = await runtime.exists("package.json");
    if (!exists) {
      throw new Error("package.json should exist in backend directory");
    }
  });

  // Test 5: File reading
  await test("File reading", async () => {
    const content = await runtime.readTextFile("package.json");
    if (typeof content !== "string" || content.length === 0) {
      throw new Error("Should be able to read package.json");
    }

    // Verify it's actually JSON
    const parsed = JSON.parse(content);
    if (parsed.name !== "claude-code-webui-backend") {
      throw new Error("package.json should contain correct package name");
    }
  });

  // Test 6: Sync file reading
  await test("Sync file reading", () => {
    const content = runtime.readTextFileSync("package.json");
    if (typeof content !== "string" || content.length === 0) {
      throw new Error("Should be able to read package.json synchronously");
    }
  });

  // Test 7: Command execution (simple test)
  await test("Command execution", async () => {
    const result = await runtime.runCommand("echo", ["test"]);
    if (typeof result.success !== "boolean") {
      throw new Error(
        "runCommand should return CommandResult with success boolean",
      );
    }
    if (typeof result.stdout !== "string") {
      throw new Error(
        "runCommand should return CommandResult with stdout string",
      );
    }
  });

  // Results
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log("🎉 All tests passed! Node.js Runtime is working correctly.");
    process.exit(0);
  } else {
    console.log("❌ Some tests failed. Please check the implementation.");
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("💥 Test runner failed:", error);
  process.exit(1);
});
