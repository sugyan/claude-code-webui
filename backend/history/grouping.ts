/**
 * Conversation grouping algorithm
 * Groups conversation files and removes duplicates from continued sessions
 */

import type { ConversationSummary } from "../../shared/types.ts";
import type { ConversationFile } from "./parser.ts";
import { isSubset } from "./parser.ts";

/**
 * Group conversations and remove duplicates from continued sessions
 * Based on the algorithm described in docs/histories.md
 */
export function groupConversations(
  conversationFiles: ConversationFile[],
): ConversationSummary[] {
  if (conversationFiles.length === 0) {
    return [];
  }

  // Sort conversations by message ID set size (ascending)
  // This ensures we process smaller conversations first
  const sortedConversations = [...conversationFiles].sort((a, b) => {
    return a.messageIds.size - b.messageIds.size;
  });

  // Remove conversations whose message ID sets are subsets of larger ones
  const uniqueConversations: ConversationFile[] = [];

  for (const currentConv of sortedConversations) {
    // Check if this conversation's message IDs are a subset of any existing unique conversation
    const isSubsetOfExisting = uniqueConversations.some((existingConv) =>
      isSubset(currentConv.messageIds, existingConv.messageIds),
    );

    if (!isSubsetOfExisting) {
      // This is either a unique conversation or the "final" version of a continued conversation
      uniqueConversations.push(currentConv);
    }
  }

  // Convert to ConversationSummary format and sort by start time (newest first)
  const summaries = uniqueConversations.map((conv) =>
    createConversationSummary(conv),
  );

  // Sort by start time, newest first
  summaries.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );

  return summaries;
}

/**
 * Create a ConversationSummary from a ConversationFile
 */
function createConversationSummary(
  conversationFile: ConversationFile,
): ConversationSummary {
  return {
    sessionId: conversationFile.sessionId,
    startTime: conversationFile.startTime,
    lastTime: conversationFile.lastTime,
    messageCount: conversationFile.messageCount,
    lastMessagePreview: conversationFile.lastMessagePreview,
  };
}

/**
 * Debug helper to analyze conversation relationships
 * Useful for understanding how conversations are grouped
 */
export function analyzeConversationRelationships(
  conversationFiles: ConversationFile[],
): {
  totalFiles: number;
  uniqueConversations: number;
  duplicateFiles: string[];
  relationships: Array<{
    file: string;
    messageIdCount: number;
    isSubsetOf: string[];
  }>;
} {
  const relationships = conversationFiles.map((conv) => {
    const isSubsetOf: string[] = [];

    for (const otherConv of conversationFiles) {
      if (
        conv.sessionId !== otherConv.sessionId &&
        isSubset(conv.messageIds, otherConv.messageIds)
      ) {
        isSubsetOf.push(otherConv.sessionId);
      }
    }

    return {
      file: conv.sessionId,
      messageIdCount: conv.messageIds.size,
      isSubsetOf,
    };
  });

  const duplicateFiles = relationships
    .filter((rel) => rel.isSubsetOf.length > 0)
    .map((rel) => rel.file);

  const uniqueConversations = conversationFiles.length - duplicateFiles.length;

  return {
    totalFiles: conversationFiles.length,
    uniqueConversations,
    duplicateFiles,
    relationships,
  };
}
