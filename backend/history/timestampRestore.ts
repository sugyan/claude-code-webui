/**
 * Timestamp restoration utilities
 * Handles restoring accurate timestamps for continued conversations
 */

// Basic interface for messages with timestamp
interface MessageWithTimestamp {
  timestamp: number;
  type: string;
  message?: { id?: string };
}

/**
 * Restore accurate timestamps for messages in a conversation
 * When conversations are continued, timestamps get overwritten
 * This function restores original timestamps from first occurrence of each message.id
 */
export function restoreTimestamps(
  messages: unknown[],
): unknown[] {
  // Create a map to track the earliest timestamp for each message ID
  const timestampMap = new Map<string, number>();

  // First pass: collect earliest timestamps for each message.id
  for (const msg of messages) {
    const typedMsg = msg as MessageWithTimestamp;
    if (typedMsg.type === "assistant" && typedMsg.message?.id) {
      const messageId = typedMsg.message.id;
      if (!timestampMap.has(messageId)) {
        timestampMap.set(messageId, typedMsg.timestamp);
      } else {
        // Keep the earliest timestamp
        const existingTimestamp = timestampMap.get(messageId)!;
        if (typedMsg.timestamp < existingTimestamp) {
          timestampMap.set(messageId, typedMsg.timestamp);
        }
      }
    }
  }

  // Second pass: restore timestamps and return updated messages
  return messages.map((msg) => {
    const typedMsg = msg as MessageWithTimestamp;
    if (typedMsg.type === "assistant" && typedMsg.message?.id) {
      const restoredTimestamp = timestampMap.get(typedMsg.message.id);
      if (restoredTimestamp) {
        return {
          ...typedMsg,
          timestamp: restoredTimestamp,
        };
      }
    }
    // For user messages and messages without IDs, keep original timestamp
    return msg;
  });
}

/**
 * Sort messages by timestamp (chronological order)
 */
export function sortMessagesByTimestamp(
  messages: unknown[],
): unknown[] {
  return [...messages].sort((a, b) => {
    return (a as MessageWithTimestamp).timestamp -
      (b as MessageWithTimestamp).timestamp;
  });
}

/**
 * Detect if this conversation was continued from another session
 * Returns the potential parent session ID if detected
 */
export function detectContinuation(
  messages: unknown[],
): string | undefined {
  // Look for system messages that might indicate continuation
  for (const msg of messages) {
    const typedMsg = msg as MessageWithTimestamp;
    if (typedMsg.type === "system") {
      // Check for continuation indicators in system messages
      // System messages might contain information about session continuation
      const content = JSON.stringify(typedMsg);
      if (content.includes("continue") || content.includes("resume")) {
        // Try to extract session ID from the message
        // This is a heuristic approach - the exact format may vary
        const sessionIdMatch = content.match(/[a-f0-9-]{36}/); // UUID pattern
        if (sessionIdMatch) {
          return sessionIdMatch[0];
        }
      }
    }
  }
  return undefined;
}

/**
 * Calculate conversation metadata from messages
 */
export function calculateConversationMetadata(
  messages: unknown[],
  _sessionId: string,
): {
  startTime: string;
  endTime: string;
  messageCount: number;
  continuedFrom?: string;
} {
  if (messages.length === 0) {
    const now = new Date().toISOString();
    return {
      startTime: now,
      endTime: now,
      messageCount: 0,
    };
  }

  // Sort messages by timestamp to get accurate start/end times
  const sortedMessages = sortMessagesByTimestamp(messages);
  const startTime = new Date(
    (sortedMessages[0] as MessageWithTimestamp).timestamp,
  )
    .toISOString();
  const endTime = new Date(
    (sortedMessages[sortedMessages.length - 1] as MessageWithTimestamp)
      .timestamp,
  ).toISOString();

  // Detect if this conversation was continued from another
  const continuedFrom = detectContinuation(messages);

  return {
    startTime,
    endTime,
    messageCount: messages.length,
    ...(continuedFrom && { continuedFrom }),
  };
}

/**
 * Process messages with timestamp restoration and sorting
 * This is the main function to call for preparing messages for API response
 */
export function processConversationMessages(
  messages: unknown[],
  sessionId: string,
): {
  messages: unknown[];
  metadata: {
    startTime: string;
    endTime: string;
    messageCount: number;
    continuedFrom?: string;
  };
} {
  // Restore timestamps
  const restoredMessages = restoreTimestamps(messages);

  // Sort by timestamp
  const sortedMessages = sortMessagesByTimestamp(restoredMessages);

  // Calculate metadata
  const metadata = calculateConversationMetadata(sortedMessages, sessionId);

  return {
    messages: sortedMessages,
    metadata,
  };
}
