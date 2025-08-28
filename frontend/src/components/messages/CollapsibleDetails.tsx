import React, { useState } from "react";

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
}

export function CollapsibleDetails({
  label,
  details,
  colorScheme,
  icon,
  badge,
  defaultExpanded = false,
}: CollapsibleDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasDetails = details.trim().length > 0;

  return (
    <div
      className={`mb-3 p-3 rounded-lg ${colorScheme.bg} border ${colorScheme.border}`}
    >
      <div
        className={`${colorScheme.header} text-xs font-medium mb-1 flex items-center gap-2 ${hasDetails ? "cursor-pointer hover:opacity-80" : ""}`}
        role={hasDetails ? "button" : undefined}
        tabIndex={hasDetails ? 0 : undefined}
        aria-expanded={hasDetails ? isExpanded : undefined}
        onClick={hasDetails ? () => setIsExpanded(!isExpanded) : undefined}
        onKeyDown={
          hasDetails
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
        {hasDetails && (
          <span className="ml-1 opacity-80">{isExpanded ? "▼" : "▶"}</span>
        )}
      </div>
      {hasDetails && isExpanded && (
        <pre
          className={`whitespace-pre-wrap ${colorScheme.content} text-xs font-mono leading-relaxed mt-2 pl-6 border-l-2 ${colorScheme.border}`}
        >
          {details}
        </pre>
      )}
    </div>
  );
}
