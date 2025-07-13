/**
 * Individual conversation loading utilities
 * Handles loading and parsing specific conversation files
 */

import type { RawHistoryLine } from "./parser.ts";
import type { ConversationHistory } from "../../shared/types.ts";
import type { Runtime } from "../runtime/types.ts";
import { processConversationMessages } from "./timestampRestore.ts";
import { validateEncodedProjectName } from "./pathUtils.ts";
import { getStreamingMessages } from "../streaming/streamingFileManager.ts";

/**
 * Load a specific conversation by session ID
 */
export async function loadConversation(
  encodedProjectName: string,
  sessionId: string,
  runtime: Runtime,
): Promise<ConversationHistory | null> {
  // Validate inputs
  if (!validateEncodedProjectName(encodedProjectName)) {
    throw new Error("Invalid encoded project name");
  }

  if (!validateSessionId(sessionId)) {
    throw new Error("Invalid session ID format");
  }

  // Get home directory
  const homeDir = runtime.getEnv("HOME");
  if (!homeDir) {
    throw new Error("HOME environment variable not found");
  }

  // Build file path
  const historyDir = `${homeDir}/.claude/projects/${encodedProjectName}`;
  const filePath = `${historyDir}/${sessionId}.jsonl`;

  // Check if file exists before trying to read it
  if (!(await runtime.exists(filePath))) {
    return null; // Session not found
  }

  try {
    const conversationHistory = await parseConversationFile(
      filePath,
      sessionId,
      runtime,
    );

    // Check for additional messages in streaming files
    const streamingMessages = await getStreamingMessages(
      encodedProjectName,
      sessionId,
      runtime,
    );

    if (streamingMessages.length > 0) {
      // Merge streaming messages with conversation history
      // The streaming messages might contain duplicates or newer messages
      const existingMessageIds = new Set<string>();

      // Build a set of existing message IDs/timestamps for deduplication
      for (const msg of conversationHistory.messages) {
        if (typeof msg === "object" && msg !== null && "timestamp" in msg) {
          existingMessageIds.add(JSON.stringify(msg));
        }
      }

      // Add non-duplicate streaming messages
      let newMessagesAdded = 0;
      for (const streamingMsg of streamingMessages) {
        const msgKey = JSON.stringify(streamingMsg);
        if (!existingMessageIds.has(msgKey)) {
          conversationHistory.messages.push(streamingMsg);
          newMessagesAdded++;
        }
      }

      if (newMessagesAdded > 0) {
        // Re-sort messages by timestamp if new messages were added
        conversationHistory.messages.sort(
          (a: unknown, b: unknown) => {
            const timeA = (a as { timestamp?: number }).timestamp || 0;
            const timeB = (b as { timestamp?: number }).timestamp || 0;
            return timeA - timeB;
          },
        );

        // Update metadata
        conversationHistory.metadata.messageCount =
          conversationHistory.messages.length;
        if (conversationHistory.messages.length > 0) {
          const lastMsg = conversationHistory.messages[
            conversationHistory.messages.length - 1
          ] as { timestamp?: number };
          if (lastMsg.timestamp) {
            conversationHistory.metadata.endTime = new Date(
              lastMsg.timestamp,
            ).toISOString();
          }
        }

        console.log(
          `[ConversationLoader] Merged ${newMessagesAdded} additional messages from streaming files for session ${sessionId}`,
        );
      }
    }

    return conversationHistory;
  } catch (error) {
    throw error; // Re-throw any parsing errors
  }
}

/**
 * Parse a specific conversation file
 * Converts JSONL lines to timestamped SDK messages
 */
async function parseConversationFile(
  filePath: string,
  sessionId: string,
  runtime: Runtime,
): Promise<ConversationHistory> {
  const content = await runtime.readTextFile(filePath);
  const lines = content
    .trim()
    .split("\n")
    .filter((line) => line.trim());

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
  runtime: Runtime,
): Promise<boolean> {
  try {
    const conversation = await loadConversation(
      encodedProjectName,
      sessionId,
      runtime,
    );
    return conversation !== null;
  } catch {
    return false;
  }
}
