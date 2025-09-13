import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

// Token types for our custom parser
interface Token {
  type: string;
  content: string;
  position: number;
  length: number;
  meta?: any;
}

// AST Node types
interface ASTNode {
  type: string;
  content?: string;
  children?: ASTNode[];
  meta?: any;
}

export class CustomMarkdownParser {
  private text: string;
  private position: number;
  private tokens: Token[];
  private isDark: boolean;

  constructor(text: string, isDark: boolean = false) {
    this.text = text;
    this.position = 0;
    this.tokens = [];
    this.isDark = isDark;
  }

  // Tokenizer: Convert text to tokens with context awareness
  tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;

    while (this.position < this.text.length) {
      // Skip whitespace but preserve it for spacing
      if (this.isWhitespace()) {
        this.tokenizeWhitespace();
        continue;
      }

      // Check for fenced code blocks with proper nesting
      if (this.matchesFencedCodeBlock()) {
        this.tokenizeFencedCodeBlock();
        continue;
      }

      // Check for headings
      if (this.matchesHeading()) {
        this.tokenizeHeading();
        continue;
      }

      // Check for bold/italic
      if (this.matchesBoldItalic()) {
        this.tokenizeBoldItalic();
        continue;
      }

      // Check for lists
      if (this.matchesList()) {
        this.tokenizeList();
        continue;
      }

      // Check for links
      if (this.matchesLink()) {
        this.tokenizeLink();
        continue;
      }

      // Check for blockquotes
      if (this.matchesBlockquote()) {
        this.tokenizeBlockquote();
        continue;
      }

      // Check for tables
      if (this.matchesTable()) {
        this.tokenizeTable();
        continue;
      }

      // Check for horizontal rules
      if (this.matchesHorizontalRule()) {
        this.tokenizeHorizontalRule();
        continue;
      }

      // Check for inline code
      if (this.matchesInlineCode()) {
        this.tokenizeInlineCode();
        continue;
      }

      // Default: treat as text
      this.tokenizeText();
    }

    return this.tokens;
  }

  // CORE INNOVATION: Context-aware fenced code block parsing
  private tokenizeFencedCodeBlock(): void {
    const start = this.position;

    // Count opening backticks (3 or 4)
    let backtickCount = 0;
    while (this.peek(backtickCount) === '`') {
      backtickCount++;
    }

    if (backtickCount < 3) {
      this.tokenizeText();
      return;
    }

    // Get language identifier
    this.position += backtickCount;
    const langStart = this.position;
    while (this.position < this.text.length &&
           this.text[this.position] !== '\n' &&
           this.text[this.position] !== '\r') {
      this.position++;
    }
    const language = this.text.slice(langStart, this.position).trim();

    // Skip newline
    if (this.peek() === '\r') this.position++;
    if (this.peek() === '\n') this.position++;

    // CRITICAL: Find the LAST valid closing delimiter (for nested structures)
    const contentStart = this.position;
    const closingPattern = '`'.repeat(backtickCount);

    let contentEnd = this.position;
    let found = false;
    let lastValidClosing = -1;

    // First pass: find all valid closing delimiters
    let scanPos = this.position;
    while (scanPos < this.text.length) {
      // Look for potential closing delimiter at start of line
      if ((scanPos === 0 || this.text[scanPos - 1] === '\n') &&
          this.text.slice(scanPos, scanPos + backtickCount) === closingPattern) {

        console.log(`🔧 Found potential closing at ${scanPos}: "${this.text.slice(scanPos, scanPos + 10)}"`);

        // Check if this is actually a valid closing delimiter
        let actualBacktickCount = 0;
        let checkPos = scanPos;
        while (checkPos < this.text.length && this.text[checkPos] === '`') {
          actualBacktickCount++;
          checkPos++;
        }

        console.log(`🔧 Expected ${backtickCount} backticks, found ${actualBacktickCount}`);

        // Only accept if it's exactly the same number of backticks and followed by whitespace or end
        if (actualBacktickCount === backtickCount) {
          const after = scanPos + backtickCount;
          const afterChar = after < this.text.length ? this.text[after] : 'EOF';
          console.log(`🔧 Character after backticks: "${afterChar}"`);

          if (after >= this.text.length ||
              this.text[after] === '\n' ||
              this.text[after] === '\r' ||
              this.text[after] === ' ' ||
              this.text[after] === '\t') {
            lastValidClosing = scanPos;
            console.log(`🔧 ✅ Valid closing delimiter at ${scanPos} (continuing to find last one)`);
          } else {
            console.log(`🔧 ❌ Rejected - not followed by whitespace/end`);
          }
        } else {
          console.log(`🔧 ❌ Rejected - wrong backtick count`);
        }
      }
      scanPos++;
    }

    // Use the last valid closing delimiter found
    if (lastValidClosing !== -1) {
      contentEnd = lastValidClosing;
      this.position = lastValidClosing + backtickCount;
      // Skip trailing whitespace on the same line
      while (this.position < this.text.length &&
             (this.text[this.position] === ' ' || this.text[this.position] === '\t')) {
        this.position++;
      }
      // Skip newline
      if (this.peek() === '\r') this.position++;
      if (this.peek() === '\n') this.position++;
      found = true;
      console.log(`🔧 🎯 Using LAST valid closing delimiter at ${contentEnd}`);
    }

    if (!found) {
      // No matching closing delimiter - treat as regular text
      this.position = start;
      this.tokenizeText();
      return;
    }

    const content = this.text.slice(contentStart, contentEnd);

    this.tokens.push({
      type: 'fenced_code_block',
      content: content,
      position: start,
      length: this.position - start,
      meta: {
        language,
        backtickCount,
        raw: this.text.slice(start, this.position)
      }
    });
  }

  // Helper methods for pattern matching
  private matchesFencedCodeBlock(): boolean {
    // Check if we're at the start of a line and have at least ```
    if (this.position === 0 || this.text[this.position - 1] === '\n' || this.text[this.position - 1] === '\r') {
      const char0 = this.peek(0);
      const char1 = this.peek(1);
      const char2 = this.peek(2);

      if (char0 === '`' && char1 === '`' && char2 === '`') {
        return true;
      }
    }
    return false;
  }

  private matchesHeading(): boolean {
    if (this.position === 0 || this.text[this.position - 1] === '\n') {
      return this.peek() === '#';
    }
    return false;
  }

  private matchesBoldItalic(): boolean {
    return this.peek() === '*' || this.peek() === '_';
  }

  private matchesList(): boolean {
    if (this.position === 0 || this.text[this.position - 1] === '\n') {
      const char = this.peek();
      return char === '-' || char === '*' || char === '+' ||
             (char >= '0' && char <= '9');
    }
    return false;
  }

  private matchesLink(): boolean {
    return this.peek() === '[';
  }

  private matchesBlockquote(): boolean {
    if (this.position === 0 || this.text[this.position - 1] === '\n') {
      return this.peek() === '>';
    }
    return false;
  }

  private matchesTable(): boolean {
    // Simple table detection - look for | characters
    return this.peek() === '|';
  }

  private matchesHorizontalRule(): boolean {
    if (this.position === 0 || this.text[this.position - 1] === '\n') {
      const char = this.peek();
      return char === '-' && this.peek(1) === '-' && this.peek(2) === '-';
    }
    return false;
  }

  private matchesInlineCode(): boolean {
    return this.peek() === '`' && !(this.peek(1) === '`' && this.peek(2) === '`');
  }

  // Tokenization methods for each element type
  private tokenizeWhitespace(): void {
    const start = this.position;
    while (this.position < this.text.length && this.isWhitespace()) {
      this.position++;
    }
    this.tokens.push({
      type: 'whitespace',
      content: this.text.slice(start, this.position),
      position: start,
      length: this.position - start
    });
  }

  private tokenizeHeading(): void {
    const start = this.position;
    let level = 0;
    while (this.peek() === '#' && level < 6) {
      level++;
      this.position++;
    }

    // Skip whitespace after #
    while (this.peek() === ' ' || this.peek() === '\t') {
      this.position++;
    }

    const contentStart = this.position;
    while (this.position < this.text.length &&
           this.peek() !== '\n' && this.peek() !== '\r') {
      this.position++;
    }

    const content = this.text.slice(contentStart, this.position).trim();

    this.tokens.push({
      type: 'heading',
      content: content,
      position: start,
      length: this.position - start,
      meta: { level }
    });
  }

  private tokenizeBoldItalic(): void {
    // Implementation for bold/italic parsing
    this.tokenizeText(); // Simplified for now
  }

  private tokenizeList(): void {
    // Implementation for list parsing
    this.tokenizeText(); // Simplified for now
  }

  private tokenizeLink(): void {
    // Implementation for link parsing
    this.tokenizeText(); // Simplified for now
  }

  private tokenizeBlockquote(): void {
    // Implementation for blockquote parsing
    this.tokenizeText(); // Simplified for now
  }

  private tokenizeTable(): void {
    // Implementation for table parsing
    this.tokenizeText(); // Simplified for now
  }

  private tokenizeHorizontalRule(): void {
    const start = this.position;
    while (this.position < this.text.length &&
           (this.peek() === '-' || this.peek() === ' ')) {
      this.position++;
    }

    this.tokens.push({
      type: 'horizontal_rule',
      content: this.text.slice(start, this.position),
      position: start,
      length: this.position - start
    });
  }

  private tokenizeInlineCode(): void {
    // Implementation for inline code parsing
    this.tokenizeText(); // Simplified for now
  }

  private tokenizeText(): void {
    const start = this.position;

    // Consume text until we hit whitespace or a special character
    while (this.position < this.text.length &&
           !this.isWhitespace() &&
           !this.matchesFencedCodeBlock() &&
           !this.matchesHeading() &&
           !this.matchesBoldItalic() &&
           !this.matchesList() &&
           !this.matchesLink() &&
           !this.matchesBlockquote() &&
           !this.matchesTable() &&
           !this.matchesHorizontalRule() &&
           !this.matchesInlineCode()) {
      this.position++;
    }

    // If we didn't consume any characters, advance by one to avoid infinite loop
    if (this.position === start) {
      this.position++;
    }

    this.tokens.push({
      type: 'text',
      content: this.text.slice(start, this.position),
      position: start,
      length: this.position - start
    });
  }

  // Helper methods
  private peek(offset: number = 0): string {
    const pos = this.position + offset;
    return pos < this.text.length ? this.text[pos] : '';
  }

  private isWhitespace(): boolean {
    const char = this.peek();
    return char === ' ' || char === '\t' || char === '\n' || char === '\r';
  }

  // Build AST from tokens
  buildAST(): ASTNode {
    const ast: ASTNode = {
      type: 'document',
      children: []
    };

    for (const token of this.tokens) {
      if (token.type === 'fenced_code_block') {
        ast.children!.push({
          type: 'code_block',
          content: token.content,
          meta: token.meta
        });
      } else if (token.type === 'heading') {
        ast.children!.push({
          type: 'heading',
          content: token.content,
          meta: token.meta
        });
      } else if (token.type === 'text') {
        ast.children!.push({
          type: 'text',
          content: token.content
        });
      } else if (token.type === 'whitespace') {
        ast.children!.push({
          type: 'text',
          content: token.content
        });
      } else if (token.type === 'horizontal_rule') {
        ast.children!.push({
          type: 'hr'
        });
      }
    }

    return ast;
  }

  // Render AST to React elements
  renderAST(ast: ASTNode): React.ReactNode {
    if (!ast.children) {
      return null;
    }

    return ast.children.map((node, index) => {
      switch (node.type) {
        case 'code_block':
          // Special handling for markdown language - render as markdown instead of code
          if (node.meta?.language === 'markdown') {
            return (
              <div key={index} className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 my-3 border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-mono">markdown</div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {node.content || ''}
                  </ReactMarkdown>
                </div>
              </div>
            );
          }

          return (
            <SyntaxHighlighter
              key={index}
              style={this.isDark ? oneDark : oneLight}
              language={node.meta?.language || 'text'}
              PreTag="div"
              className="rounded-lg my-3"
            >
              {node.content || ''}
            </SyntaxHighlighter>
          );

        case 'heading':
          const HeadingTag = `h${node.meta?.level || 1}` as keyof JSX.IntrinsicElements;
          return (
            <HeadingTag
              key={index}
              className={`font-bold mb-3 mt-4 first:mt-0 ${
                this.isDark ? "text-slate-100" : "text-slate-900"
              } ${this.getHeadingSize(node.meta?.level || 1)}`}
            >
              {node.content}
            </HeadingTag>
          );

        case 'hr':
          return (
            <hr
              key={index}
              className={`my-4 border-0 h-px ${
                this.isDark ? "bg-slate-600" : "bg-slate-300"
              }`}
            />
          );

        case 'text':
          return <span key={index}>{node.content}</span>;

        default:
          return <span key={index}>{node.content}</span>;
      }
    });
  }

  private getHeadingSize(level: number): string {
    switch (level) {
      case 1: return 'text-xl';
      case 2: return 'text-lg';
      case 3: return 'text-base';
      case 4: return 'text-sm';
      case 5: return 'text-sm';
      case 6: return 'text-sm';
      default: return 'text-base';
    }
  }

  // Main parse method
  parse(): React.ReactNode {
    this.tokenize();
    const ast = this.buildAST();
    return this.renderAST(ast);
  }
}