import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";
import { useTheme } from "../hooks/useSettings";
import { CustomMarkdownParser } from "./CustomMarkdownParser";

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

  // Detect if content has nested fenced code blocks that need custom parsing
  const hasNestedFencedBlocks = (text: string): boolean => {
    // Simple but effective: just count ``` occurrences
    // If there are more than 2, we likely have nesting
    const backtickMatches = text.match(/^```/gm);
    const backtickCount = backtickMatches ? backtickMatches.length : 0;

    console.log('🔍 Found', backtickCount, 'fenced code block delimiters');

    // If we have more than 2 ``` lines, we likely have nesting
    // (outer block start + end = 2, any more suggests inner blocks)
    if (backtickCount > 2) {
      console.log('🔍 Multiple fenced blocks detected - using custom parser');
      return true;
    }

    console.log('🔍 Simple structure - using standard parser');
    return false;
  };

  // If we detect nested fenced blocks, use our custom parser
  const useCustomParser = hasNestedFencedBlocks(content);

  if (useCustomParser) {
    console.log('🔧 Using custom parser for nested fenced blocks');
    const customParser = new CustomMarkdownParser(content, isDark);
    return (
      <div className={`markdown-content ${className}`}>
        {customParser.parse()}
      </div>
    );
  }

  console.log('📝 Using standard react-markdown parser');

  const components: Components = {
    // Code blocks with syntax highlighting
    code({ className: codeClassName, children, ...props }) {
      const inline =
        !props.node || !props.node.children || props.node.children.length === 0;
      const match = /language-(\w+)/.exec(codeClassName || "");
      const language = match ? match[1] : "";
      const childText = String(children);

      if (!inline && language) {
        return (
          <SyntaxHighlighter
            style={isDark ? oneDark : oneLight}
            language={language}
            PreTag="div"
            className="rounded-lg my-3"
          >
            {childText.replace(/\n$/, "")}
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

    h4({ children, ...props }) {
      return (
        <h4
          className={`text-sm font-semibold mb-2 mt-3 first:mt-0 ${
            isDark ? "text-slate-200" : "text-slate-800"
          }`}
          {...props}
        >
          {children}
        </h4>
      );
    },

    h5({ children, ...props }) {
      return (
        <h5
          className={`text-sm font-medium mb-1 mt-2 first:mt-0 ${
            isDark ? "text-slate-300" : "text-slate-700"
          }`}
          {...props}
        >
          {children}
        </h5>
      );
    },

    h6({ children, ...props }) {
      return (
        <h6
          className={`text-sm font-medium mb-1 mt-2 first:mt-0 ${
            isDark ? "text-slate-300" : "text-slate-700"
          }`}
          {...props}
        >
          {children}
        </h6>
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
          className={`underline hover:no-underline transition-colors ${
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

    // Tables
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

    thead({ children, ...props }) {
      return (
        <thead
          className={
            isDark ? "bg-slate-700" : "bg-slate-100"
          }
          {...props}
        >
          {children}
        </thead>
      );
    },

    th({ children, ...props }) {
      return (
        <th
          className={`border px-3 py-2 text-left font-semibold ${
            isDark
              ? "border-slate-600 text-slate-200"
              : "border-slate-300 text-slate-800"
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

    // Task list items (GitHub-flavored markdown)
    input({ type, checked, ...props }) {
      if (type === "checkbox") {
        return (
          <input
            type="checkbox"
            checked={checked}
            disabled
            className="mr-2"
            {...props}
          />
        );
      }
      return <input type={type} {...props} />;
    },
  };

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}