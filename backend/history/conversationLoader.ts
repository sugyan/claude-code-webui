/**
 * Individual conversation loading utilities
 * Handles loading and parsing specific conversation files
 */

import type { RawHistoryLine } from "./parser.ts";
import type { ConversationHistory } from "../../shared/types.ts";
import { processConversationMessages } from "./timestampRestore.ts";
import { validateEncodedProjectName } from "./pathUtils.ts";

/**
 * Load a specific conversation by session ID
 */
export async function loadConversation(
  encodedProjectName: string,
  sessionId: string,
): Promise<ConversationHistory | null> {
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
    const conversationHistory = await parseConversationFile(
      filePath,
      sessionId,
    );
    return conversationHistory;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null; // Session not found
    }
    throw error; // Re-throw other errors
  }
}

/**
 * Parse a specific conversation file
 * Converts JSONL lines to timestamped SDK messages
 */
async function parseConversationFile(
  filePath: string,
  sessionId: string,
): Promise<ConversationHistory> {
  const content = await Deno.readTextFile(filePath);
  const lines = content.trim().split("\n").filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error("Empty conversation file");
  }

  const rawLines: RawHistoryLine[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as RawHistoryLine;
      rawLines.push(parsed);
    } catch (parseError) {
      console.error(`Failed to parse line in ${filePath}:`, parseError);
      // Continue processing other lines
    }
  }

  // Process messages (restore timestamps, sort, etc.)
  const { messages: processedMessages, metadata } = processConversationMessages(
    rawLines,
    sessionId,
  );

  return {
    sessionId,
    messages: processedMessages,
    metadata,
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
