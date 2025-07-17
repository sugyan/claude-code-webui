/**
 * Windows path normalization utilities
 */

/**
 * Normalize Windows paths for cross-platform compatibility
 * - Remove leading slash from Windows absolute paths like /C:/...
 * - Convert backslashes to forward slashes
 */
export function normalizeWindowsPath(path: string): string {
  return path.replace(/^\/([A-Za-z]:)/, "$1").replace(/\\/g, "/");
}
