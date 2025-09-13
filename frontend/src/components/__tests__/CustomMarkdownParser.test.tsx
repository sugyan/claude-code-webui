import { describe, it, expect } from "vitest";
import { CustomMarkdownParser } from "../CustomMarkdownParser";
import { render } from "@testing-library/react";
import React from "react";

describe("CustomMarkdownParser", () => {
  it("should handle nested fenced code blocks correctly", () => {
    const nestedMarkdown = `\`\`\`markdown
# Documentation Example

Here's a Python function:

\`\`\`python
def greet(name):
    return f"Hello, {name}!"
\`\`\`

And here's a JavaScript version:

\`\`\`javascript
function greet(name) {
    return \`Hello, \${name}!\`;
}
\`\`\`

Both do the same thing!
\`\`\``;

    const parser = new CustomMarkdownParser(nestedMarkdown, false);
    const tokens = parser.tokenize();

    // Should have one fenced code block token (the outer one)
    const codeBlocks = tokens.filter((t) => t.type === "fenced_code_block");
    expect(codeBlocks).toHaveLength(1);

    // The outer block should be identified as markdown
    expect(codeBlocks[0].meta.language).toBe("markdown");

    // The content should include the nested blocks intact
    expect(codeBlocks[0].content).toContain("```python");
    expect(codeBlocks[0].content).toContain("```javascript");
    expect(codeBlocks[0].content).toContain("def greet(name):");
    expect(codeBlocks[0].content).toContain("function greet(name)");
  });

  it("should correctly match opening and closing backtick counts", () => {
    const markdown = `\`\`\`\`javascript
// This is a code block with 4 backticks
const nested = \`\`\`
This should be part of the code
\`\`\`;
\`\`\`\``;

    const parser = new CustomMarkdownParser(markdown, false);
    const tokens = parser.tokenize();

    const codeBlocks = tokens.filter((t) => t.type === "fenced_code_block");
    expect(codeBlocks).toHaveLength(1);
    expect(codeBlocks[0].meta.backtickCount).toBe(4);
    expect(codeBlocks[0].content).toContain("const nested = ```");
  });

  it("should not close code block with different backtick count", () => {
    const markdown = `\`\`\`python
# This block uses 3 backticks
\`\`\`\`
This should still be inside the block
\`\`\``;

    const parser = new CustomMarkdownParser(markdown, false);
    const tokens = parser.tokenize();

    const codeBlocks = tokens.filter((t) => t.type === "fenced_code_block");
    expect(codeBlocks).toHaveLength(1);
    expect(codeBlocks[0].content).toContain("````");
    expect(codeBlocks[0].content).toContain(
      "This should still be inside the block",
    );
  });

  it("should render nested blocks correctly", () => {
    const nestedMarkdown = `\`\`\`markdown
# Example

\`\`\`python
print("Hello")
\`\`\`
\`\`\``;

    const parser = new CustomMarkdownParser(nestedMarkdown, false);
    const result = parser.parse();

    // Render and check the result
    const { container } = render(<div>{result}</div>);

    // Should have one code block rendered
    const codeBlocks = container.querySelectorAll('[class*="language-"]');
    expect(codeBlocks).toHaveLength(1);

    // Should preserve the nested content
    const codeContent = container.textContent;
    expect(codeContent).toContain("# Example");
    expect(codeContent).toContain("```python");
    expect(codeContent).toContain('print("Hello")');
  });
});
