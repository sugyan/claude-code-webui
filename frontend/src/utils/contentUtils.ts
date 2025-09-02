export interface ContentPreview {
  preview: string;
  hasMore: boolean;
  totalLines: number;
  previewLines: number;
}

export interface StructuredPatchHunk {
  lines: string[];
}

export interface EditToolUseResult {
  structuredPatch: StructuredPatchHunk[];
}

export interface BashToolUseResult {
  stdout: string;
  stderr: string;
  interrupted: boolean;
  isImage: boolean;
}

/**
 * Type guard functions for tool use results
 */
export function isValidHunk(hunk: unknown): hunk is StructuredPatchHunk {
  return (
    typeof hunk === "object" &&
    hunk !== null &&
    "lines" in hunk &&
    Array.isArray((hunk as Record<string, unknown>).lines)
  );
}

export function isValidStructuredPatch(
  patch: unknown,
): patch is StructuredPatchHunk[] {
  return Array.isArray(patch) && patch.every(isValidHunk);
}

export function isEditToolUseResult(
  result: unknown,
): result is EditToolUseResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "structuredPatch" in result &&
    isValidStructuredPatch((result as Record<string, unknown>).structuredPatch)
  );
}

export function isBashToolUseResult(
  result: unknown,
): result is BashToolUseResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "stdout" in result &&
    typeof (result as Record<string, unknown>).stdout === "string" &&
    "stderr" in result &&
    typeof (result as Record<string, unknown>).stderr === "string"
  );
}

export function createContentPreview(
  content: string,
  maxPreviewLines: number = 5,
): ContentPreview {
  if (!content || content.trim().length === 0) {
    return {
      preview: "",
      hasMore: false,
      totalLines: 0,
      previewLines: 0,
    };
  }

  const lines = content.split("\n");
  const totalLines = lines.length;

  if (totalLines <= maxPreviewLines) {
    return {
      preview: content,
      hasMore: false,
      totalLines,
      previewLines: totalLines,
    };
  }

  const previewLines = lines.slice(0, maxPreviewLines);
  const preview = previewLines.join("\n");

  return {
    preview,
    hasMore: true,
    totalLines,
    previewLines: maxPreviewLines,
  };
}

/**
 * Simplified Edit result processor - replaces multiple complex functions
 */
export function createEditResult(
  structuredPatch: unknown,
  fallbackContent: string,
  autoExpandThreshold: number = 20,
): {
  details: string;
  summary: string;
  defaultExpanded: boolean;
  previewContent?: string;
} {
  if (!isValidStructuredPatch(structuredPatch)) {
    return {
      details: fallbackContent,
      summary: "",
      defaultExpanded: true,
    };
  }

  let addedLines = 0;
  let removedLines = 0;
  const allLines: string[] = [];

  // Process all lines from structured patch
  for (const hunk of structuredPatch) {
    for (const line of hunk.lines) {
      allLines.push(line);

      if (line.startsWith("+")) {
        addedLines++;
      } else if (line.startsWith("-")) {
        removedLines++;
      }
    }
  }

  const details = allLines.join("\n");
  const totalLines = allLines.length;
  const shouldExpand = totalLines <= autoExpandThreshold;

  let summary = "";
  if (addedLines > 0 && removedLines > 0) {
    summary = `+${addedLines}/-${removedLines} lines`;
  } else if (addedLines > 0) {
    summary = `+${addedLines} lines`;
  } else if (removedLines > 0) {
    summary = `-${removedLines} lines`;
  }

  return {
    details,
    summary,
    defaultExpanded: shouldExpand,
    previewContent: shouldExpand
      ? undefined
      : allLines.slice(0, autoExpandThreshold).join("\n"),
  };
}

export function createBashPreview(
  stdout: string,
  stderr: string,
  isError: boolean,
  maxPreviewLines: number = 5,
): ContentPreview {
  const content = isError ? stderr : stdout;
  return createContentPreview(content, maxPreviewLines);
}

export function createMoreLinesIndicator(
  totalLines: number,
  previewLines: number,
): string {
  const moreLines = totalLines - previewLines;
  return `[+${moreLines} more line${moreLines === 1 ? "" : "s"}]`;
}
