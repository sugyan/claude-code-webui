# Claude Code Web UI - CLI Argument Passthrough

## Overview

This feature allows you to pass through any claude-code CLI arguments when starting claude-code-webui, including `--dangerously-skip-permissions` and others.

## Usage

### 1. Global Configuration (Recommended)

Pass arguments through `--claude-arg` when starting the web UI:

```bash
# Single argument
node backend/cli/node.js --claude-arg --dangerously-skip-permissions

# Multiple arguments
node backend/cli/node.js \
  --claude-arg --dangerously-skip-permissions \
  --claude-arg --debug \
  --claude-arg --permission-mode=bypassPermissions

# Arguments with values
node backend/cli/node.js \
  --claude-arg --model=sonnet \
  --claude-arg --allowed-tools=Bash,Edit,Read
```

### 2. Argument Merging

- **Global Arguments**: Passed via `--claude-arg` at startup, applied to all requests
- **Request-Specific Arguments**: Passed via `claudeArgs` field in API requests, applied only to current request

Argument merging logic:

```
Final Arguments = [Global Arguments, ..., Request-Specific Arguments, ...]
```

## Implementation Details

### 1. CLI Argument Parsing (backend/cli/args.ts)

```typescript
interface ParsedArgs {
  debug: boolean;
  port: number;
  host: string;
  claudePath?: string;
  claudeArgs: string[]; // New field
}

program.option(
  "--claude-arg <arg...>",
  "Pass additional arguments to claude-code CLI (can be used multiple times)",
  [],
);
```

### 2. Type Definitions (shared/types.ts)

```typescript
export interface ChatRequest {
  message: string;
  sessionId?: string;
  requestId: string;
  allowedTools?: string[];
  workingDirectory?: string;
  permissionMode?: "default" | "plan" | "acceptEdits";
  claudeArgs?: string[]; // New field
}
```

### 3. Configuration Propagation (backend/handlers/chat.ts)

```typescript
// Merge global and request-specific arguments
const mergedClaudeArgs = [
  ...(globalClaudeArgs || []),
  ...(chatRequest.claudeArgs || []),
];

// Pass to claude-code CLI
for await (const sdkMessage of query({
  prompt: processedMessage,
  options: {
    abortController,
    executable: "node" as const,
    executableArgs: mergedClaudeArgs, // Use merged arguments
    pathToClaudeCodeExecutable: cliPath,
    // ... other options
  },
})) {
  // ...
}
```

## Supported Parameter Examples

Based on `claude --help` output, the following parameters are supported:

### Permission-related

- `--dangerously-skip-permissions` - Skip all permission checks
- `--allow-dangerously-skip-permissions` - Enable bypassing all permission checks as an option
- `--permission-mode <mode>` - Permission mode (acceptEdits, bypassPermissions, default, dontAsk, plan)

### Tool-related

- `--allowed-tools <tools...>` - Comma or space-separated list of tool names to allow
- `--disallowed-tools <tools...>` - Comma or space-separated list of tool names to deny
- `--tools <tools...>` - Specify the list of available tools from the built-in set

### Model-related

- `--model <model>` - Model for the current session (sonnet, opus, etc.)
- `--fallback-model <model>` - Enable automatic fallback to specified model when default model is overloaded

### MCP-related

- `--mcp-config <configs...>` - Load MCP servers from JSON files or strings
- `--strict-mcp-config` - Only use MCP servers from --mcp-config, ignoring all other MCP configurations

### Debug-related

- `--debug [filter]` - Enable debug mode with optional category filtering
- `--verbose` - Override verbose mode setting from config

### Other

- `--system-prompt <prompt>` - System prompt to use for the session
- `--append-system-prompt <prompt>` - Append a system prompt to the default system prompt
- `--settings <file-or-json>` - Path to a settings JSON file or a JSON string to load additional settings from
- `--add-dir <directories...>` - Additional directories to allow tool access to

## API Usage Examples

### 1. Frontend Integration

If the frontend needs to support these arguments, you can add a settings interface:

```typescript
const chatRequest: ChatRequest = {
  message: "Hello Claude",
  requestId: generateId(),
  sessionId: "session-123",
  allowedTools: ["Bash", "Edit"],
  permissionMode: "default",
  claudeArgs: ["--dangerously-skip-permissions"], // Request-specific arguments
};

fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(chatRequest),
});
```

### 2. Environment Variable Configuration

You can also consider setting default arguments through environment variables:

```bash
export CLAUDE_WEBUI_DEFAULT_ARGS="--dangerously-skip-permissions --debug"
node backend/cli/node.js
```

## Security Considerations

1. **`--dangerously-skip-permissions`**: This parameter bypasses all permission checks and should only be used in sandboxed or trusted environments
2. **Tool Restrictions**: It's recommended to always explicitly specify `--allowed-tools` to limit available tools
3. **Directory Access**: Only add necessary directories when using `--add-dir`

## Troubleshooting

### 1. Arguments Not Taking Effect

Check if the startup logs contain the passed-through arguments:

```bash
node backend/cli/node.js --claude-arg --dangerously-skip-permissions --debug
```

### 2. Type Errors

Ensure that frontend and backend type definitions are consistent, especially the `ChatRequest` interface.

### 3. Parameter Conflicts

Some parameters may conflict with each other, such as `--allowed-tools` and `--disallowed-tools`. Please refer to the claude-code official documentation.
