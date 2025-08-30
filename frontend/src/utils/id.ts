import type { UUID } from "crypto";

/**
 * ID generation utility that works in both secure and non-secure contexts
 *
 * crypto.randomUUID() requires HTTPS in non-localhost environments.
 * This provides fallbacks for HTTP connections on local networks.
 */

/**
 * Generate a unique UUID string
 *
 * Fallback hierarchy:
 * 1. crypto.randomUUID() - Most secure (HTTPS + localhost only)
 * 2. crypto.getRandomValues() - Secure random (works on HTTP)
 * 3. Math.random() - Pseudorandom fallback
 *
 * Note: Only the first method produces true UUID v4.
 * Others generate UUID-format strings with varying security levels.
 */
export function generateId(): UUID {
  // 1st choice: crypto.randomUUID() (HTTPS + localhost only)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      console.debug(
        "crypto.randomUUID() not available, trying crypto.getRandomValues()",
      );
    }
  }

  // 2nd choice: crypto.getRandomValues() (more secure than Math.random)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    try {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);

      // Set version (4) and variant bits according to UUID v4 spec
      array[6] = (array[6] & 0x0f) | 0x40; // Version 4
      array[8] = (array[8] & 0x3f) | 0x80; // Variant bits

      // Convert to hex string with dashes
      const hex = Array.from(array)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32),
      ].join("-") as UUID;
    } catch {
      console.debug(
        "crypto.getRandomValues() not available, using Math.random() fallback",
      );
    }
  }

  // 3rd choice: Math.random() fallback (least secure)
  console.debug(
    "Using Math.random() for ID generation - not cryptographically secure",
  );
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  }) as UUID;
}
