# Claude Code Web UI

[![CI](https://github.com/sugyan/claude-code-webui/actions/workflows/ci.yml/badge.svg)](https://github.com/sugyan/claude-code-webui/actions/workflows/ci.yml)
[![Release](https://github.com/sugyan/claude-code-webui/actions/workflows/release.yml/badge.svg)](https://github.com/sugyan/claude-code-webui/actions/workflows/release.yml)

A web-based interface for the `claude` command line tool that provides streaming responses in a chat interface.

[codeGeneration-dark-2025-06-20T15-06-24.webm](https://github.com/user-attachments/assets/559a46ae-41b9-440d-af3a-70ffe8e177fe)


## 🔒 Security Considerations

**This tool executes the `claude` CLI command locally and provides web access to it.** Please be aware of the following security considerations:

### For Local Use (Recommended)
- ✅ **Localhost access** (`127.0.0.1`) - Safest option for personal development
- ✅ **Local network sharing** - Can be accessed by other devices on your trusted network (e.g., smartphone, tablet)

### Important Security Notes
- ⚠️ **Network exposure**: When binding to `0.0.0.0` or your network IP, the tool becomes accessible to other devices on your network
- ⚠️ **No authentication**: The tool currently has no built-in authentication mechanism
- ⚠️ **Full system access**: Claude can read files and execute commands in your selected project directories
- 🚫 **Public internet**: Never expose this tool to the public internet without proper security measures

### Safe Network Usage
```bash
# Local only (default)
./claude-code-webui --port 8080

# Network accessible (use with caution on trusted networks only)
./claude-code-webui --port 8080 --host 0.0.0.0
```

## About This Tool

This application serves as a **web UI for the Claude CLI tool**. Instead of interacting with Claude through the command line, you can:

- **Select project directories** to work with specific codebases
- Use a modern chat interface accessible from any device on your network
- View streaming responses in real-time
- Access the same Claude functionality with better UX
- Switch between different projects seamlessly
- Use from mobile devices when connected to your local network

The tool works by:
1. Selecting a project directory from configured projects or browsing for new ones
2. Running a local web server that accepts chat messages
3. Using the Claude Code SDK to execute claude commands in the selected project directory
4. Streaming the JSON responses back to the web interface
5. Displaying the formatted responses in a chat UI

## Installation

### Binary Releases (Recommended)

Download the latest pre-built binary for your platform from [Releases](https://github.com/sugyan/claude-code-webui/releases):

- **Linux**: `claude-code-webui-linux-x64`, `claude-code-webui-linux-arm64`
- **macOS**: `claude-code-webui-macos-x64`, `claude-code-webui-macos-arm64`

```bash
# Example for macOS ARM64
curl -LO https://github.com/sugyan/claude-code-webui/releases/latest/download/claude-code-webui-macos-arm64
chmod +x claude-code-webui-macos-arm64
./claude-code-webui-macos-arm64

# With custom port
./claude-code-webui-macos-arm64 --port 9000

# Show help
./claude-code-webui-macos-arm64 --help
```

### Development Setup

#### Quick Start

1. **Start Backend**:

   ```bash
   cd backend
   deno task dev
   ```

2. **Start Frontend**:

   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Application**: http://localhost:3000
   - First, select a project directory from the list or choose a new one
   - Then interact with Claude in the context of that project

#### Port Configuration

You can customize the backend port using a `.env` file in the project root:

```bash
# Create .env file for custom port
echo "PORT=9000" > .env

# Both backend and frontend will use the same port
cd backend && deno task dev     # Starts on port 9000
cd frontend && npm run dev      # Proxies to localhost:9000
```

**Alternative methods:**
- Environment variable: `PORT=9000 deno task dev` (backend)
- CLI argument: `./claude-code-webui --port 9000` (binary)
- Frontend port: `npm run dev -- --port 4000` (if needed)

## Documentation

See [CLAUDE.md](./CLAUDE.md) for comprehensive documentation including:

- Architecture overview
- Development setup
- Available commands
- Design decisions

## Prerequisites

### Required

- **Claude CLI tool** - This application requires the official `claude` command line tool to be installed and properly configured with your API key
  - Install from: https://github.com/anthropics/claude-code
  - Must be accessible in your `$PATH`
  - Must be authenticated (run `claude auth` first)

### For Development

- **Deno** (for backend development)
- **Node.js** (for frontend development)

## Development Setup

### Repository Secrets (for maintainers)

To enable automated releases via tagpr, add the following secret to the repository:

1. Go to GitHub repository Settings → Secrets and variables → Actions
2. Add a new repository secret named `GH_PAT`
3. Use a Personal Access Token with the following permissions:
   - `contents:write` - for creating releases and tags
   - `actions:write` - for triggering the release workflow
   - `pull-requests:write` - for creating release PRs

Without this token, tagpr will still create release PRs but won't trigger the binary build workflow.

## License

MIT
