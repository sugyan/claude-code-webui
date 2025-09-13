// Quick test to debug the parser issue
import { CustomMarkdownParser } from "./src/components/CustomMarkdownParser.tsx";

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

console.log("Testing nested markdown:");
console.log("Input:", nestedMarkdown);
console.log("\n");

const parser = new CustomMarkdownParser(nestedMarkdown, false);
const tokens = parser.tokenize();

console.log("Total tokens:", tokens.length);
console.log("\nToken types:");
tokens.forEach((token, i) => {
  console.log(`${i}: ${token.type} (length: ${token.length}, pos: ${token.position})`);
  if (token.type === 'fenced_code_block') {
    console.log(`   Language: ${token.meta?.language}, Backticks: ${token.meta?.backtickCount}`);
    console.log(`   Content preview: ${token.content?.substring(0, 100)}...`);
  }
});

const codeBlocks = tokens.filter(t => t.type === 'fenced_code_block');
console.log("\nCode blocks found:", codeBlocks.length);