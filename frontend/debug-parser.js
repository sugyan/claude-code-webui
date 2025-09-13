const text = `\`\`\`markdown
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

// Find positions of all ``` sequences
let pos = 0;
let count = 0;
while (pos < text.length) {
  const idx = text.indexOf('```', pos);
  if (idx === -1) break;
  console.log(`Position ${idx}: "${text.slice(idx, idx + 10).replace(/\n/g, '\\n')}"`);
  count++;
  pos = idx + 1;
}

console.log('\nTotal ``` sequences found:', count);
console.log('\nText length:', text.length);
console.log('\nPositions: 0 (outer start), 159 (python start), 257 (js start)');