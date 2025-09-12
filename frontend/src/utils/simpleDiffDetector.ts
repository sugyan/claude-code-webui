/**
 * Simple diff detection utility for Edit tool results
 */

export interface DiffLine {
  type: 'addition' | 'removal' | 'context';
  content: string;
  originalContent: string; // Content without +/- markers
}

/**
 * Check if content contains diff-style lines (lines starting with + or -)
 */
export function hasDiffContent(content: string): boolean {
  const lines = content.split('\n');
  return lines.some(line => 
    line.startsWith('+') || line.startsWith('-')
  );
}

/**
 * Parse content into diff lines with type classification
 */
export function parseDiffLines(content: string): DiffLine[] {
  const lines = content.split('\n');
  
  return lines.map(line => {
    if (line.startsWith('+')) {
      return {
        type: 'addition' as const,
        content: line,
        originalContent: line.substring(1) // Remove + marker
      };
    } else if (line.startsWith('-')) {
      return {
        type: 'removal' as const,
        content: line,
        originalContent: line.substring(1) // Remove - marker
      };
    } else {
      return {
        type: 'context' as const,
        content: line,
        originalContent: line
      };
    }
  });
}