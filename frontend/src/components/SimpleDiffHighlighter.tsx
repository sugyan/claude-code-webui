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
    const baseStyles = "block px-2 py-1 text-sm font-mono";
    
    switch (line.type) {
      case 'addition':
        return isDark
          ? `${baseStyles} bg-green-900/50 text-green-300 border-l-2 border-green-500`
          : `${baseStyles} bg-green-50 text-green-700 border-l-2 border-green-400`;
      
      case 'removal':
        return isDark
          ? `${baseStyles} bg-red-900/50 text-red-300 border-l-2 border-red-500`
          : `${baseStyles} bg-red-50 text-red-700 border-l-2 border-red-400`;
      
      default: // context
        return isDark
          ? `${baseStyles} text-emerald-300`
          : `${baseStyles} text-emerald-700`;
    }
  };

  const getPrefix = () => {
    switch (line.type) {
      case 'addition':
        return <span className="text-green-500 font-bold mr-1">+</span>;
      case 'removal':
        return <span className="text-red-500 font-bold mr-1">-</span>;
      default:
        return <span className="text-transparent mr-1"> </span>; // Maintain alignment
    }
  };

  return (
    <div className={getLineStyles()}>
      {getPrefix()}
      <span>{line.originalContent}</span>
    </div>
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
      <pre className={`whitespace-pre-wrap font-mono text-sm ${className}`}>
        {content}
      </pre>
    );
  }
  
  // Parse diff lines and render with highlighting
  const diffLines = parseDiffLines(content);
  
  return (
    <div className={`font-mono text-sm ${className}`}>
      {diffLines.map((line, index) => (
        <DiffLineComponent
          key={index}
          line={line}
          isDark={isDark}
        />
      ))}
    </div>
  );
}