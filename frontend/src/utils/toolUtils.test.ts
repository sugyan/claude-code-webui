import { describe, it, expect } from "vitest";
import {
  extractToolInfo,
  generateToolPatterns,
  generateToolPattern,
} from "./toolUtils";

describe("toolUtils", () => {
  describe("extractToolInfo", () => {
    it("should extract single command from simple bash command", () => {
      const result = extractToolInfo("Bash", { command: "ls -la" });
      expect(result.toolName).toBe("Bash");
      expect(result.commands).toEqual(["ls"]);
    });

    it("should extract multiple commands from compound bash command with &&", () => {
      const result = extractToolInfo("Bash", {
        command: "cd venv && pwd && ls -la",
      });
      expect(result.toolName).toBe("Bash");
      expect(result.commands).toEqual(["ls"]); // cd and pwd are builtins, filtered out
    });

    it("should extract multiple commands and filter out bash builtins", () => {
      const result = extractToolInfo("Bash", {
        command: "cd dir && find . && grep pattern",
      });
      expect(result.toolName).toBe("Bash");
      expect(result.commands).toEqual(["find", "grep"]);
    });

    it("should handle commands with semicolon separator", () => {
      const result = extractToolInfo("Bash", {
        command: "echo hello; ls; pwd",
      });
      expect(result.toolName).toBe("Bash");
      expect(result.commands).toEqual(["echo", "ls"]); // pwd is builtin, echo and ls require permission
    });

    it("should handle commands with pipe separator", () => {
      const result = extractToolInfo("Bash", { command: "ls | grep .txt" });
      expect(result.toolName).toBe("Bash");
      expect(result.commands).toEqual(["ls", "grep"]);
    });

    it("should handle multi-word commands", () => {
      const result = extractToolInfo("Bash", {
        command: "git log && cargo build",
      });
      expect(result.toolName).toBe("Bash");
      expect(result.commands).toEqual(["git log", "cargo build"]);
    });

    it("should return unique commands when duplicated", () => {
      const result = extractToolInfo("Bash", {
        command: "ls && find . && ls -la",
      });
      expect(result.toolName).toBe("Bash");
      expect(result.commands).toEqual(["ls", "find"]);
    });

    it("should handle non-Bash tools with wildcard", () => {
      const result = extractToolInfo("Write", { file_path: "/path/to/file" });
      expect(result.toolName).toBe("Write");
      expect(result.commands).toEqual(["*"]);
    });

    it("should extract echo command (no longer a builtin)", () => {
      const result = extractToolInfo("Bash", {
        command: "cd dir && pwd && echo hello",
      });
      expect(result.toolName).toBe("Bash");
      expect(result.commands).toEqual(["echo"]); // cd and pwd are builtins, echo requires permission
    });

    it("should handle command -v (no longer a builtin)", () => {
      const result = extractToolInfo("Bash", {
        command: "command -v ls",
      });
      expect(result.toolName).toBe("Bash");
      expect(result.commands).toEqual(["command"]); // command now requires permission
    });

    it("should handle type command (no longer a builtin)", () => {
      const result = extractToolInfo("Bash", {
        command: "type -t ls",
      });
      expect(result.toolName).toBe("Bash");
      expect(result.commands).toEqual(["type"]); // type now requires permission
    });

    it("should use fallback when all commands are builtins", () => {
      const result = extractToolInfo("Bash", {
        command: "cd /tmp && pwd && which git",
      });
      expect(result.toolName).toBe("Bash");
      expect(result.commands).toEqual(["cd", "pwd", "which"]); // All are builtins, use fallback
    });

    it("should handle find command with complex arguments", () => {
      const result = extractToolInfo("Bash", {
        command: "find . -name '*.txt'",
      });
      expect(result.toolName).toBe("Bash");
      expect(result.commands).toEqual(["find"]);
    });

    it("should handle grep command with pattern and files", () => {
      const result = extractToolInfo("Bash", {
        command: "grep -r 'pattern' /path/to/files",
      });
      expect(result.toolName).toBe("Bash");
      expect(result.commands).toEqual(["grep"]);
    });

    it("should handle complex compound command with find, grep, and ls", () => {
      const result = extractToolInfo("Bash", {
        command: "find . -name '*.txt' | grep pattern && ls -la",
      });
      expect(result.toolName).toBe("Bash");
      expect(result.commands).toEqual(["find", "grep", "ls"]);
    });

    it("should handle commands with arguments before options", () => {
      const result = extractToolInfo("Bash", {
        command: "tar -czf archive.tar.gz /path/to/files",
      });
      expect(result.toolName).toBe("Bash");
      expect(result.commands).toEqual(["tar"]);
    });
  });

  describe("generateToolPatterns", () => {
    it("should generate single pattern for non-Bash tools", () => {
      const patterns = generateToolPatterns("Write", ["*"]);
      expect(patterns).toEqual(["Write"]);
    });

    it("should generate multiple patterns for Bash commands", () => {
      const patterns = generateToolPatterns("Bash", ["ls", "grep"]);
      expect(patterns).toEqual(["Bash(ls:*)", "Bash(grep:*)"]);
    });

    it("should handle wildcard commands", () => {
      const patterns = generateToolPatterns("Bash", ["*"]);
      expect(patterns).toEqual(["Bash"]);
    });

    it("should handle mixed commands", () => {
      const patterns = generateToolPatterns("Bash", ["ls", "*", "grep"]);
      expect(patterns).toEqual(["Bash(ls:*)", "Bash", "Bash(grep:*)"]);
    });
  });

  describe("generateToolPattern (backward compatibility)", () => {
    it("should generate single pattern for Bash command", () => {
      const pattern = generateToolPattern("Bash", "ls");
      expect(pattern).toBe("Bash(ls:*)");
    });

    it("should return tool name for wildcard", () => {
      const pattern = generateToolPattern("Bash", "*");
      expect(pattern).toBe("Bash");
    });

    it("should return tool name for non-Bash tools", () => {
      const pattern = generateToolPattern("Write", "anything");
      expect(pattern).toBe("Write");
    });
  });
});
