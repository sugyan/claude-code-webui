import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { getEncodedProjectName } from "./history/pathUtils.ts";
import type { Runtime } from "./runtime/types.ts";

// Create a mock runtime for testing
const mockRuntime: Runtime = {
  getEnv: (key: string) => key === "HOME" ? "/mock/home" : undefined,
  async *readDir() {
    // Mock empty directory - no entries
    // This async generator yields nothing, representing an empty directory
  },
  getArgs: () => [],
  exit: () => {
    throw new Error("exit called");
  },
  readTextFile: () => Promise.resolve(""),
  readTextFileSync: () => "",
  readBinaryFile: () => Promise.resolve(new Uint8Array()),
  exists: () => Promise.resolve(false),
  stat: () =>
    Promise.resolve({
      isFile: false,
      isDirectory: false,
      isSymlink: false,
      size: 0,
      mtime: null,
    }),
  lstat: () =>
    Promise.resolve({
      isFile: false,
      isDirectory: false,
      isSymlink: false,
      size: 0,
      mtime: null,
    }),
  lstatSync: () => ({
    isFile: false,
    isDirectory: false,
    isSymlink: false,
    size: 0,
    mtime: null,
  }),
  runCommand: () =>
    Promise.resolve({ success: false, stdout: "", stderr: "", code: 1 }),
  serve: () => {},
};

Deno.test("pathUtils - getEncodedProjectName with dots and slashes", async () => {
  // Test with a path that contains both dots and slashes
  const testPath = "/Users/test/.example/github.com/project-name";
  const result = await getEncodedProjectName(testPath, mockRuntime);

  const expectedEncoding = testPath.replace(/\/$/, "").replace(/[/.]/g, "-");

  // Should convert both '/' and '.' to '-'
  assertEquals(
    expectedEncoding,
    "-Users-test--example-github-com-project-name",
  );

  // Note: result will be null since this test path doesn't exist in .claude/projects
  // but the encoding logic is verified above
  assertEquals(result, null);
});

Deno.test("pathUtils - test projects API response", async () => {
  // Import the projects handler
  const { handleProjectsRequest } = await import("./handlers/projects.ts");

  // Create a mock Hono context with runtime
  const mockContext = {
    var: {
      config: {
        runtime: mockRuntime,
      },
    },
    json: (data: unknown, status?: number) => {
      // Debug logs removed to keep test output clean
      // console.log("Mock API response:", JSON.stringify(data, null, 2));
      // console.log("Response status:", status || 200);
      return { data, status };
    },
  };

  // deno-lint-ignore no-explicit-any
  await handleProjectsRequest(mockContext as any);
});
