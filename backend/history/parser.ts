/**
 * JSONL file parsing utilities for conversation history
 * Handles reading and parsing Claude conversation history files
 */

import type {
  SDKAssistantMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-code";
import { logger } from "../utils/logger.ts";
import { readTextFile, readDir } from "../utils/fs.ts";

// Raw JSONL line structure from Claude history files
export interface RawHistoryLine {
  type: "user" | "assistant" | "system" | "result";
  message?: SDKUserMessage["message"] | SDKAssistantMessage["message"];
  sessionId: string;
  timestamp: string; // ISO string format
  uuid: string;
  parentUuid?: string | null;
  isSidechain?: boolean;
  userType?: string;
  cwd?: string;
  version?: string;
  requestId?: string;
}

// Legacy interface maintained for transition period
// TODO: Remove once all references are updated to use ConversationHistory
export interface ConversationFile {
  sessionId: string;
  filePath: string;
  messages: RawHistoryLine[];
  messageIds: Set<string>;
  startTime: string;
  lastTime: string;
  messageCount: number;
  lastMessagePreview: string;
}

/**
 * Parse a single JSONL file and extract conversation data
 * @private - Internal function used by parseAllHistoryFiles
 */
async function parseHistoryFile(
  filePath: string,
): Promise<ConversationFile | null> {
  try {
    const content = await readTextFile(filePath);
    const lines = content
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    if (lines.length === 0) {
      return null; // Empty file
    }

    const messages: RawHistoryLine[] = [];
    const messageIds = new Set<string>();
    let startTime = "";
    let lastTime = "";
    let lastMessagePreview = "";

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as RawHistoryLine;
        messages.push(parsed);

        // Track message IDs from assistant messages
        if (parsed.message?.role === "assistant" && parsed.message?.id) {
          messageIds.add(parsed.message.id);
        }

        // Track timestamps
        if (!startTime || parsed.timestamp < startTime) {
          startTime = parsed.timestamp;
        }
        if (!lastTime || parsed.timestamp > lastTime) {
          lastTime = parsed.timestamp;
        }

        // Extract last message preview (from assistant messages)
        if (parsed.message?.role === "assistant" && parsed.message?.content) {
          const content = parsed.message.content;
          if (Array.isArray(content)) {
            // Handle array format content
            for (const item of content) {
              if (typeof item === "object" && item && "text" in item) {
                lastMessagePreview = String(item.text).substring(0, 100);
                break;
              }
            }
          } else if (typeof content === "string") {
            lastMessagePreview = content.substring(0, 100);
          }
        }
      } catch (parseError) {
        logger.history.error(`Failed to parse line in ${filePath}: {error}`, {
          error: parseError,
        });
        // Continue processing other lines
      }
    }

    // Extract session ID from file name (remove .jsonl extension)
    const fileName = filePath.split("/").pop() || "";
    const sessionId = fileName.replace(".jsonl", "");

    return {
      sessionId,
      filePath,
      messages,
      messageIds,
      startTime,
      lastTime,
      messageCount: messages.length,
      lastMessagePreview: lastMessagePreview || "No preview available",
    };
  } catch (error) {
    logger.history.error(`Failed to read history file ${filePath}: {error}`, {
      error,
    });
    return null;
  }
}

/**
 * Get all JSONL files in a history directory
 * @private - Internal function used by parseAllHistoryFiles
 */
async function getHistoryFiles(historyDir: string): Promise<string[]> {
  try {
    const files: string[] = [];

    for await (const entry of readDir(historyDir)) {
      if (entry.isFile && entry.name.endsWith(".jsonl")) {
        files.push(`${historyDir}/${entry.name}`);
      }
    }

    return files;
  } catch {
    // Directory doesn't exist or can't be read
    return [];
  }
}

/**
 * Parse all conversation files in a history directory
 * Used by the histories endpoint to get conversation summaries
 */
export async function parseAllHistoryFiles(
  historyDir: string,
): Promise<ConversationFile[]> {
  const filePaths = await getHistoryFiles(historyDir);
  const results: ConversationFile[] = [];

  for (const filePath of filePaths) {
    const parsed = await parseHistoryFile(filePath);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

/**
 * Check if one set of message IDs is a subset of another
 */
export function isSubset<T>(subset: Set<T>, superset: Set<T>): boolean {
  if (subset.size > superset.size) {
    return false;
  }

  for (const item of subset) {
    if (!superset.has(item)) {
      return false;
    }
  }

  return true;
}
