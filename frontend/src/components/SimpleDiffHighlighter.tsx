import React from 'react';
import { hasDiffContent, parseDiffLines, type DiffLine } from '../utils/simpleDiffDetector';
import { useTheme } from '../hooks/useSettings';

interface SimpleDiffHighlighterProps {
  content: string;
  className?: string;
}

interface DiffLineProps {
  line: DiffLine;
  isDark: boolean;
}

function DiffLineComponent({ line, isDark }: DiffLineProps) {
  const getLineStyles = () => {
    switch (line.type) {
      case 'addition':
        return isDark
          ? `bg-green-900/30 text-green-300`
          : `bg-green-50 text-green-700`;
      
      case 'removal':
        return isDark
          ? `bg-red-900/30 text-red-300`
          : `bg-red-50 text-red-700`;
      
      default: // context
        return isDark
          ? `text-emerald-300`
          : `text-emerald-700`;
    }
  };

  return (
    <span className={getLineStyles()}>
      {line.content}
    </span>
  );
}

export function SimpleDiffHighlighter({ content, className = '' }: SimpleDiffHighlighterProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Check if content contains diff lines
  const isDiff = hasDiffContent(content);
  
  // If not a diff, render as plain pre
  if (!isDiff) {
    return (
      <pre className={`whitespace-pre-wrap font-mono leading-relaxed ${className}`}>
        {content}
      </pre>
    );
  }
  
  // Parse diff lines and render with highlighting
  const diffLines = parseDiffLines(content);
  
  return (
    <pre className={`whitespace-pre-wrap font-mono leading-relaxed ${className}`}>
      {diffLines.map((line, index) => (
        <React.Fragment key={index}>
          <DiffLineComponent
            line={line}
            isDark={isDark}
          />
          {index < diffLines.length - 1 && '\n'}
        </React.Fragment>
      ))}
    </pre>
  );
}