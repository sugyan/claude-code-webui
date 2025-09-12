import React, { useState } from "react";
import {
  createContentPreview,
  createMoreLinesIndicator,
} from "../../utils/contentUtils";
import { SimpleDiffHighlighter } from "../SimpleDiffHighlighter";

interface CollapsibleDetailsProps {
  label: string;
  details: string;
  colorScheme: {
    header: string;
    content: string;
    border: string;
    bg: string;
  };
  icon?: React.ReactNode;
  badge?: string;
  defaultExpanded?: boolean;
  maxPreviewLines?: number;
  showPreview?: boolean;
  previewContent?: string;
  previewSummary?: string;
  useDiffHighlighter?: boolean;
}

export function CollapsibleDetails({
  label,
  details,
  colorScheme,
  icon,
  badge,
  defaultExpanded = false,
  maxPreviewLines = 5,
  showPreview = true,
  previewContent,
  previewSummary,
  useDiffHighlighter = false,
}: CollapsibleDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasDetails = details.trim().length > 0;
  const isCollapsible = hasDetails && !defaultExpanded;

  const contentPreview = React.useMemo(() => {
    const computedTotalLines = details.split("\n").length;
    if (previewContent !== undefined) {
      return {
        preview: previewContent,
        hasMore: true,
        totalLines: computedTotalLines,
        previewLines: previewContent.split("\n").length,
      };
    }
    // Only create preview if showPreview is enabled
    if (showPreview) {
      return createContentPreview(details, maxPreviewLines);
    }
    // Return no preview
    return {
      preview: "",
      hasMore: false,
      totalLines: computedTotalLines,
      previewLines: 0,
    };
  }, [details, maxPreviewLines, previewContent, showPreview]);

  const shouldShowPreview =
    showPreview && !isExpanded && hasDetails && contentPreview.hasMore;

  return (
    <div
      className={`mb-3 p-3 rounded-lg ${colorScheme.bg} border ${colorScheme.border}`}
    >
      <div
        className={`${colorScheme.header} text-xs font-medium mb-1 flex items-center gap-2 ${isCollapsible ? "cursor-pointer hover:opacity-80" : ""}`}
        role={isCollapsible ? "button" : undefined}
        tabIndex={isCollapsible ? 0 : undefined}
        aria-expanded={isCollapsible ? isExpanded : undefined}
        onClick={isCollapsible ? () => setIsExpanded(!isExpanded) : undefined}
        onKeyDown={
          isCollapsible
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsExpanded(!isExpanded);
                }
              }
            : undefined
        }
      >
        {icon && (
          <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs">
            {icon}
          </div>
        )}
        <span>{label}</span>
        {badge && <span className="opacity-80">({badge})</span>}
        {previewSummary && (
          <span className="opacity-60 text-xs ml-2">{previewSummary}</span>
        )}
        {isCollapsible && (
          <span className="ml-1 opacity-80">{isExpanded ? "▼" : "▶"}</span>
        )}
      </div>
      {shouldShowPreview && (
        <div
          className="mt-2 pl-6 border-l-2 border-dashed opacity-80"
          style={{ borderColor: "inherit" }}
        >
          {useDiffHighlighter ? (
            <SimpleDiffHighlighter content={contentPreview.preview} className="text-xs leading-relaxed" />
          ) : (
            <pre
              className={`whitespace-pre-wrap ${colorScheme.content} text-xs font-mono leading-relaxed`}
            >
              {contentPreview.preview}
            </pre>
          )}
          <div
            className={`${colorScheme.content} text-xs opacity-60 mt-1 italic`}
          >
            {createMoreLinesIndicator(
              contentPreview.totalLines,
              contentPreview.previewLines,
            )}
          </div>
        </div>
      )}
      {hasDetails && isExpanded && (
        <div
          className={`${colorScheme.content} text-xs leading-relaxed mt-2 pl-6 border-l-2 ${colorScheme.border}`}
        >
          {useDiffHighlighter ? (
            <SimpleDiffHighlighter content={details} />
          ) : (
            <pre className="whitespace-pre-wrap font-mono leading-relaxed">
              {details}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
