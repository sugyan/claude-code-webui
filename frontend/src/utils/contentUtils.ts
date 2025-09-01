export interface ContentPreview {
  preview: string;
  hasMore: boolean;
  totalLines: number;
  previewLines: number;
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

export interface DiffPreview {
  preview: string;
  summary: string;
  hasMore: boolean;
  addedLines: number;
  removedLines: number;
}

export function createDiffPreview(
  structuredPatch: unknown[],
  maxPreviewLines: number = 10,
): DiffPreview {
  if (!structuredPatch || structuredPatch.length === 0) {
    return {
      preview: "",
      summary: "",
      hasMore: false,
      addedLines: 0,
      removedLines: 0,
    };
  }

  let addedLines = 0;
  let removedLines = 0;
  const previewLines: string[] = [];
  let lineCount = 0;

  for (const patch of structuredPatch) {
    const patchObj = patch as { lines: string[] };
    for (const line of patchObj.lines) {
      if (line.startsWith("+")) {
        addedLines++;
      } else if (line.startsWith("-")) {
        removedLines++;
      }

      if (lineCount < maxPreviewLines) {
        previewLines.push(line);
        lineCount++;
      }
    }
  }

  const preview = previewLines.join("\n");
  const hasMore = lineCount >= maxPreviewLines;

  let summary = "";
  if (addedLines > 0 && removedLines > 0) {
    summary = `+${addedLines}/-${removedLines} lines`;
  } else if (addedLines > 0) {
    summary = `+${addedLines} lines`;
  } else if (removedLines > 0) {
    summary = `-${removedLines} lines`;
  }

  return {
    preview,
    summary,
    hasMore,
    addedLines,
    removedLines,
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
