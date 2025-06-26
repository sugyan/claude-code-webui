/**
 * Path utilities for conversation history functionality
 * Handles conversion between project paths and Claude history directory names
 */

/**
 * Encode a project path to a Claude history directory name
 * Example: "/Users/sugyan/tmp/" → "-Users-sugyan-tmp"
 */
export function encodeProjectPath(projectPath: string): string {
  // Remove trailing slash if present
  const normalizedPath = projectPath.replace(/\/$/, "");

  // Convert slashes to hyphens
  // Leading slash becomes a leading hyphen
  const encoded = normalizedPath.replace(/\//g, "-");

  return encoded;
}

/**
 * Decode a Claude history directory name back to a project path
 * Example: "-Users-sugyan-tmp" → "/Users/sugyan/tmp"
 */
export function decodeProjectPath(encodedPath: string): string {
  // Convert hyphens back to slashes
  const decoded = encodedPath.replace(/-/g, "/");

  return decoded;
}

/**
 * Get the full path to the Claude history directory for a project
 */
export function getHistoryDirectory(projectPath: string): string {
  const homeDir = Deno.env.get("HOME");
  if (!homeDir) {
    throw new Error("HOME environment variable not found");
  }

  const encodedPath = encodeProjectPath(projectPath);
  return `${homeDir}/.claude/projects/${encodedPath}`;
}

/**
 * Validate that a project path is safe and well-formed
 */
export function validateProjectPath(projectPath: string): boolean {
  // Basic validation - should be an absolute path
  if (!projectPath.startsWith("/")) {
    return false;
  }

  // Should not contain dangerous characters
  // deno-lint-ignore no-control-regex
  const dangerousChars = /[<>:"|?*\x00-\x1f]/;
  if (dangerousChars.test(projectPath)) {
    return false;
  }

  return true;
}

/**
 * Sanitize a project path parameter from URL
 * Handles URL decoding and basic cleanup
 */
export function sanitizeProjectPath(rawPath: string): string {
  // URL decode
  const decoded = decodeURIComponent(rawPath);

  // Basic cleanup - remove multiple slashes, normalize
  const normalized = decoded.replace(/\/+/g, "/");

  return normalized;
}
