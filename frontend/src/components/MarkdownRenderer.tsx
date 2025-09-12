import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";
import { useTheme } from "../hooks/useSettings";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [showDebug, setShowDebug] = useState(false);

  // Fix nested code block issues - replace ```markdown blocks that contain ```python with ````markdown blocks
  const fixedContent = content.replace(
    /```markdown\n([\s\S]*?```[\s\S]*?```[\s\S]*?)\n```/g,
    "````markdown\n$1\n````",
  );
  const components: Components = {
    // Code blocks with syntax highlighting
    code({ className: codeClassName, children, ...props }) {
      const inline =
        !props.node || !props.node.children || props.node.children.length === 0;
      const match = /language-(\w+)/.exec(codeClassName || "");
      const language = match ? match[1] : "";

      if (!inline && language) {
        // For markdown language blocks, use plain text to avoid nested parsing issues
        if (language === "markdown") {
          return (
            <pre
              className={`text-sm p-3 rounded border overflow-auto ${
                isDark
                  ? "bg-slate-800 text-slate-200 border-slate-600"
                  : "bg-slate-50 text-slate-800 border-slate-300"
              }`}
            >
              <code className="whitespace-pre-wrap">
                {String(children).replace(/\n$/, "")}
              </code>
            </pre>
          );
        }

        return (
          <SyntaxHighlighter
            style={isDark ? oneDark : oneLight}
            language={language}
            PreTag="div"
            className="rounded-lg my-3"
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        );
      }

      // Inline code
      return (
        <code
          className={`px-1.5 py-0.5 rounded text-sm font-mono ${
            isDark
              ? "bg-slate-700 text-slate-200"
              : "bg-slate-200 text-slate-800"
          }`}
          {...props}
        >
          {children}
        </code>
      );
    },

    // Headings with proper styling
    h1({ children, ...props }) {
      return (
        <h1
          className={`text-xl font-bold mb-3 mt-4 first:mt-0 ${
            isDark ? "text-slate-100" : "text-slate-900"
          }`}
          {...props}
        >
          {children}
        </h1>
      );
    },

    h2({ children, ...props }) {
      return (
        <h2
          className={`text-lg font-semibold mb-2 mt-4 first:mt-0 ${
            isDark ? "text-slate-100" : "text-slate-900"
          }`}
          {...props}
        >
          {children}
        </h2>
      );
    },

    h3({ children, ...props }) {
      return (
        <h3
          className={`text-base font-semibold mb-2 mt-3 first:mt-0 ${
            isDark ? "text-slate-200" : "text-slate-800"
          }`}
          {...props}
        >
          {children}
        </h3>
      );
    },

    // Paragraphs with proper spacing
    p({ children, ...props }) {
      return (
        <p
          className={`mb-3 last:mb-0 leading-relaxed ${
            isDark ? "text-slate-100" : "text-slate-900"
          }`}
          {...props}
        >
          {children}
        </p>
      );
    },

    // Lists with proper styling
    ul({ children, ...props }) {
      return (
        <ul
          className={`list-disc list-inside mb-3 space-y-1 ${
            isDark ? "text-slate-100" : "text-slate-900"
          }`}
          {...props}
        >
          {children}
        </ul>
      );
    },

    ol({ children, ...props }) {
      return (
        <ol
          className={`list-decimal list-inside mb-3 space-y-1 ${
            isDark ? "text-slate-100" : "text-slate-900"
          }`}
          {...props}
        >
          {children}
        </ol>
      );
    },

    li({ children, ...props }) {
      return (
        <li className="leading-relaxed" {...props}>
          {children}
        </li>
      );
    },

    // Links with proper styling
    a({ children, href, ...props }) {
      return (
        <a
          href={href}
          className={`underline hover:no-underline ${
            isDark
              ? "text-blue-400 hover:text-blue-300"
              : "text-blue-600 hover:text-blue-700"
          }`}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    },

    // Blockquotes
    blockquote({ children, ...props }) {
      return (
        <blockquote
          className={`border-l-4 pl-4 my-3 italic ${
            isDark
              ? "border-slate-600 text-slate-300"
              : "border-slate-300 text-slate-600"
          }`}
          {...props}
        >
          {children}
        </blockquote>
      );
    },

    // Strong/bold text
    strong({ children, ...props }) {
      return (
        <strong
          className={`font-semibold ${
            isDark ? "text-slate-100" : "text-slate-900"
          }`}
          {...props}
        >
          {children}
        </strong>
      );
    },

    // Emphasis/italic text
    em({ children, ...props }) {
      return (
        <em className="italic" {...props}>
          {children}
        </em>
      );
    },

    // Horizontal rule
    hr({ ...props }) {
      return (
        <hr
          className={`my-4 border-0 h-px ${
            isDark ? "bg-slate-600" : "bg-slate-300"
          }`}
          {...props}
        />
      );
    },

    // Tables (if needed)
    table({ children, ...props }) {
      return (
        <div className="overflow-x-auto my-3">
          <table
            className={`min-w-full border-collapse ${
              isDark ? "border-slate-600" : "border-slate-300"
            }`}
            {...props}
          >
            {children}
          </table>
        </div>
      );
    },

    th({ children, ...props }) {
      return (
        <th
          className={`border px-3 py-2 text-left font-semibold ${
            isDark
              ? "border-slate-600 bg-slate-700 text-slate-200"
              : "border-slate-300 bg-slate-100 text-slate-800"
          }`}
          {...props}
        >
          {children}
        </th>
      );
    },

    td({ children, ...props }) {
      return (
        <td
          className={`border px-3 py-2 ${
            isDark
              ? "border-slate-600 text-slate-200"
              : "border-slate-300 text-slate-800"
          }`}
          {...props}
        >
          {children}
        </td>
      );
    },
  };

  return (
    <div className={`markdown-content ${className}`}>
      {/* Debug button */}
      <div className="mb-2">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className={`text-xs px-2 py-1 rounded border transition-colors ${
            isDark
              ? "bg-slate-700 hover:bg-slate-600 text-slate-300 border-slate-600"
              : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300"
          }`}
        >
          {showDebug ? "Hide Source" : "Show Source"}
        </button>
      </div>

      {/* Debug view - raw markdown */}
      {showDebug && (
        <div className="mb-4">
          <div
            className={`text-xs font-semibold mb-2 ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Markdown Source:
          </div>
          <pre
            className={`text-sm p-3 rounded border overflow-auto max-h-48 whitespace-pre-wrap ${
              isDark
                ? "bg-slate-800 text-slate-200 border-slate-600"
                : "bg-slate-50 text-slate-800 border-slate-300"
            }`}
          >
            {fixedContent}
          </pre>
        </div>
      )}

      {/* Rendered markdown */}
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {fixedContent}
      </ReactMarkdown>
    </div>
  );
}
