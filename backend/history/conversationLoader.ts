/**
 * Individual conversation loading utilities
 * Handles loading and parsing specific conversation files
 */

import type { ConversationFile, ParsedMessage } from "./parser.ts";
import { validateEncodedProjectName } from "./pathUtils.ts";

/**
 * Load a specific conversation by session ID
 */
export async function loadConversation(
  encodedProjectName: string,
  sessionId: string,
): Promise<ConversationFile | null> {
  // Validate inputs
  if (!validateEncodedProjectName(encodedProjectName)) {
    throw new Error("Invalid encoded project name");
  }

  if (!validateSessionId(sessionId)) {
    throw new Error("Invalid session ID format");
  }

  // Get home directory
  const homeDir = Deno.env.get("HOME");
  if (!homeDir) {
    throw new Error("HOME environment variable not found");
  }

  // Build file path
  const historyDir = `${homeDir}/.claude/projects/${encodedProjectName}`;
  const filePath = `${historyDir}/${sessionId}.jsonl`;

  try {
    const conversationFile = await parseConversationFile(filePath, sessionId);
    return conversationFile;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null; // Session not found
    }
    throw error; // Re-throw other errors
  }
}

/**
 * Parse a specific conversation file
 * Similar to parseHistoryFile but optimized for single file loading
 */
async function parseConversationFile(
  filePath: string,
  sessionId: string,
): Promise<ConversationFile> {
  const content = await Deno.readTextFile(filePath);
  const lines = content.trim().split("\n").filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error("Empty conversation file");
  }

  const messages: ParsedMessage[] = [];
  const messageIds = new Set<string>();
  let startTime = "";
  let lastTime = "";
  let lastMessagePreview = "";

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as ParsedMessage;
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
      console.error(`Failed to parse line in ${filePath}:`, parseError);
      // Continue processing other lines
    }
  }

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
}

/**
 * Validate session ID format
 * Should be a valid filename without dangerous characters
 */
function validateSessionId(sessionId: string): boolean {
  // Should not be empty
  if (!sessionId) {
    return false;
  }

  // Should not contain dangerous characters for filenames
  // deno-lint-ignore no-control-regex
  const dangerousChars = /[<>:"|?*\x00-\x1f\/\\]/;
  if (dangerousChars.test(sessionId)) {
    return false;
  }

  // Should not be too long (reasonable filename length)
  if (sessionId.length > 255) {
    return false;
  }

  // Should not start with dots (hidden files)
  if (sessionId.startsWith(".")) {
    return false;
  }

  return true;
}

/**
 * Check if a conversation exists without loading it
 */
export async function conversationExists(
  encodedProjectName: string,
  sessionId: string,
): Promise<boolean> {
  try {
    const conversation = await loadConversation(encodedProjectName, sessionId);
    return conversation !== null;
  } catch {
    return false;
  }
}
