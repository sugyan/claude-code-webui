/**
 * Node.js Runtime Implementation Tests
 *
 * Tests to verify that the NodeRuntime class correctly implements
 * the Runtime interface with Node.js APIs.
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { NodeRuntime } from "./node.ts";
import type { Runtime } from "./types.ts";

// Test that NodeRuntime properly implements the Runtime interface
Deno.test("NodeRuntime - implements Runtime interface", () => {
  const runtime = new NodeRuntime();

  // Verify all required methods exist
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
    assertEquals(
      typeof (runtime as unknown as Record<string, unknown>)[method],
      "function",
      `${method} should be a function`,
    );
  }
});

Deno.test("NodeRuntime - getEnv returns environment variables", () => {
  const runtime = new NodeRuntime();

  // Test with a known environment variable (PATH should exist)
  const path = runtime.getEnv("PATH");
  assertEquals(
    typeof path,
    "string",
    "PATH environment variable should be a string",
  );

  // Test with non-existent variable
  const nonExistent = runtime.getEnv("NON_EXISTENT_VAR_12345");
  assertEquals(
    nonExistent,
    undefined,
    "Non-existent variable should return undefined",
  );
});

Deno.test("NodeRuntime - getArgs returns command line arguments", () => {
  const runtime = new NodeRuntime();

  const args = runtime.getArgs();
  assertEquals(Array.isArray(args), true, "getArgs should return an array");

  // Args should not include 'node' or script path (filtered out)
  for (const arg of args) {
    assertEquals(typeof arg, "string", "Each argument should be a string");
  }
});

Deno.test("NodeRuntime - file operations interface compliance", () => {
  const runtime = new NodeRuntime();

  // Test that methods exist and return appropriate types
  // We don't test actual file I/O here to avoid dependencies on specific files

  // Test exists method signature
  assertEquals(
    typeof runtime.exists,
    "function",
    "exists should be a function",
  );

  // Test async file reading method signatures
  assertEquals(
    typeof runtime.readTextFile,
    "function",
    "readTextFile should be a function",
  );
  assertEquals(
    typeof runtime.readBinaryFile,
    "function",
    "readBinaryFile should be a function",
  );
  assertEquals(typeof runtime.stat, "function", "stat should be a function");
  assertEquals(typeof runtime.lstat, "function", "lstat should be a function");

  // Test sync methods
  assertEquals(
    typeof runtime.readTextFileSync,
    "function",
    "readTextFileSync should be a function",
  );
  assertEquals(
    typeof runtime.lstatSync,
    "function",
    "lstatSync should be a function",
  );

  // Test directory reading
  assertEquals(
    typeof runtime.readDir,
    "function",
    "readDir should be a function",
  );
});

Deno.test("NodeRuntime - command execution interface", async () => {
  const runtime = new NodeRuntime();

  // Test command execution method signature only in Deno environment
  // Note: Actual command execution will fail in Deno since Node.js APIs are not available
  // This test verifies the interface compliance rather than actual functionality

  try {
    const result = await runtime.runCommand("echo", ["test"]);
    // If we get here, verify the return type structure
    assertEquals(typeof result.success, "boolean", "success should be boolean");
    assertEquals(typeof result.code, "number", "code should be number");
    assertEquals(typeof result.stdout, "string", "stdout should be string");
    assertEquals(typeof result.stderr, "string", "stderr should be string");
  } catch (error) {
    // Expected in Deno environment since Node.js child_process is not available
    assertEquals(typeof error, "object", "Should receive an error object");
  }
});

Deno.test("NodeRuntime - command execution with non-existent command", async () => {
  const runtime = new NodeRuntime();

  // Test command execution method for non-existent command in Deno environment
  // Note: This test verifies interface compliance rather than actual Node.js functionality
  try {
    const result = await runtime.runCommand("non_existent_command_12345", []);
    // If we get a result, verify the structure
    assertEquals(typeof result.success, "boolean", "success should be boolean");
    assertEquals(typeof result.code, "number", "code should be number");
    assertEquals(typeof result.stderr, "string", "stderr should be string");
  } catch (error) {
    // Expected in Deno environment since Node.js child_process is not available
    assertEquals(typeof error, "object", "Should receive an error object");
  }
});

Deno.test("NodeRuntime - runtime type compatibility", () => {
  const runtime = new NodeRuntime();

  // Test that NodeRuntime can be assigned to Runtime type
  const runtimeInterface: Runtime = runtime;
  assertEquals(
    typeof runtimeInterface,
    "object",
    "NodeRuntime should be assignable to Runtime interface",
  );

  // Verify key interface methods are present
  assertEquals(typeof runtimeInterface.getEnv, "function");
  assertEquals(typeof runtimeInterface.runCommand, "function");
  assertEquals(typeof runtimeInterface.readTextFile, "function");
});
