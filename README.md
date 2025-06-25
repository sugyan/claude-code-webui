# 🌐 Claude Code Web UI

[![CI](https://github.com/sugyan/claude-code-webui/actions/workflows/ci.yml/badge.svg)](https://github.com/sugyan/claude-code-webui/actions/workflows/ci.yml)
[![Release](https://github.com/sugyan/claude-code-webui/actions/workflows/release.yml/badge.svg)](https://github.com/sugyan/claude-code-webui/actions/workflows/release.yml)
[![Version](https://img.shields.io/github/v/release/sugyan/claude-code-webui)](https://github.com/sugyan/claude-code-webui/releases)
[![Downloads](https://img.shields.io/github/downloads/sugyan/claude-code-webui/total)](https://github.com/sugyan/claude-code-webui/releases)

> **A modern web interface for Claude Code CLI** - Transform your command-line coding experience into an intuitive web-based chat interface

[🎬 **View Demo**](https://github.com/user-attachments/assets/35dd960c-ed1a-43ee-927d-ca9cdb490855)

---

## 📑 Table of Contents

- [✨ Why Claude Code Web UI?](#why-claude-code-web-ui)
- [🚀 Quick Start](#quick-start)
- [⚙️ CLI Options](#️-cli-options)
- [🔧 Development](#development)
- [🔒 Security Considerations](#security-considerations)
- [📚 Documentation](#documentation)
- [❓ FAQ](#faq)
- [🤝 Contributing](#contributing)
- [📄 License](#license)

---

## ✨ Why Claude Code Web UI?

**Transform the way you interact with Claude Code**

Instead of being limited to command-line interactions, Claude Code Web UI brings you:

| CLI Experience | Web UI Experience |
|----------------|-------------------|
| ⌨️ Terminal only | 🌐 Any device with a browser |
| 📱 Desktop bound | 📱 Mobile-friendly interface |
| 🔄 Command repetition | 💬 Conversational flow |
| 📝 Plain text output | 🎨 Rich formatted responses |
| 🗂️ Manual directory switching | 📁 Visual project selection |

### Perfect for:
- 👨‍💻 **Developers** who prefer visual interfaces
- 📱 **Mobile users** who want to code on-the-go
- 👥 **Teams** sharing coding sessions
- 🔄 **Multi-project** workflows
- 💡 **Rapid prototyping** with visual feedback

---

## 🚀 Quick Start

Get up and running in under 2 minutes:

### Option 1: Binary Release (Recommended)

```bash
# Download and run (macOS ARM64 example)
curl -LO https://github.com/sugyan/claude-code-webui/releases/latest/download/claude-code-webui-macos-arm64
chmod +x claude-code-webui-macos-arm64
./claude-code-webui-macos-arm64

# Open browser to http://localhost:8080
```

### Option 2: Development Mode

```bash
# Backend
cd backend && deno task dev

# Frontend (new terminal)
cd frontend && npm run dev

# Open browser to http://localhost:3000
```

### Prerequisites

- ✅ **Claude CLI** installed and authenticated ([Get it here](https://github.com/anthropics/claude-code))
- ✅ **Modern browser** (Chrome, Firefox, Safari, Edge)


---

## ⚙️ CLI Options

The backend server supports the following command-line options:

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --port <port>` | Port to listen on | 8080 |
| `--host <host>` | Host address to bind to | 127.0.0.1 |
| `-d, --debug` | Enable debug mode | false |
| `-h, --help` | Show help message | - |
| `-V, --version` | Show version | - |

### Environment Variables

- `PORT` - Same as `--port`
- `DEBUG` - Same as `--debug`

### Examples

```bash
# Default (localhost:8080)
./claude-code-webui

# Custom port
./claude-code-webui --port 3000

# Bind to all interfaces (accessible from network)
./claude-code-webui --host 0.0.0.0 --port 9000

# Enable debug mode
./claude-code-webui --debug

# Using environment variables
PORT=9000 DEBUG=true ./claude-code-webui
```

---

## 🔧 Development

### Setup

```bash
# Clone repository
git clone https://github.com/sugyan/claude-code-webui.git
cd claude-code-webui

# Start backend
cd backend
deno task dev

# Start frontend (new terminal)
cd frontend
npm run dev
```

### Port Configuration

Create `.env` file in project root:

```bash
echo "PORT=9000" > .env
```

Both backend and frontend will automatically use this port.


---

## 🔒 Security Considerations

**Important**: This tool executes Claude CLI locally and provides web access to it.

### ✅ Safe Usage Patterns

- **🏠 Local development**: Default localhost access
- **🏢 Trusted networks**: LAN access for team collaboration
- **🔐 Project isolation**: Claude only accesses selected directories

### ⚠️ Security Notes

- **No authentication**: Currently no built-in auth mechanism
- **System access**: Claude can read/write files in selected projects
- **Network exposure**: Configurable but requires careful consideration

### 🛡️ Best Practices

```bash
# Local only (recommended)
./claude-code-webui --port 8080

# Network access (trusted networks only)
./claude-code-webui --port 8080 --host 0.0.0.0
```

**Never expose to public internet without proper security measures.**

---

## 📚 Documentation

For comprehensive technical documentation, see [CLAUDE.md](./CLAUDE.md) which covers:

- Architecture overview and design decisions
- Detailed development setup instructions
- API reference and message types

---

## ❓ FAQ

<details>
<summary><strong>Q: Do I need Claude API access?</strong></summary>

Yes, you need the Claude CLI tool installed and authenticated. The web UI is a frontend for the existing Claude CLI.
</details>

<details>
<summary><strong>Q: Can I use this on mobile?</strong></summary>

Yes! The web interface is fully responsive and works great on mobile devices when connected to your local network.
</details>

<details>
<summary><strong>Q: Is my code safe?</strong></summary>

Yes, everything runs locally. No data is sent to external servers except Claude's normal API calls through the CLI.
</details>

<details>
<summary><strong>Q: Can I deploy this to a server?</strong></summary>

While technically possible, it's designed for local use. If deploying remotely, ensure proper authentication and security measures.
</details>

<details>
<summary><strong>Q: How do I update?</strong></summary>

Download the latest binary from releases or pull the latest code for development mode.
</details>

<details>
<summary><strong>Q: What if Claude CLI isn't found?</strong></summary>

Ensure Claude CLI is installed and available in your PATH. Run `claude --version` to verify.
</details>

---

## 🤝 Contributing

We welcome contributions! Please see our [development setup](#-development) and feel free to:

- 🐛 Report bugs
- ✨ Suggest features  
- 📝 Improve documentation
- 🔧 Submit pull requests

**Fun fact**: This project is almost entirely written and committed by Claude Code itself! 🤖  
We'd love to see pull requests from your Claude Code sessions too :)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Made with ❤️ for the Claude Code community**

[⭐ Star this repo](https://github.com/sugyan/claude-code-webui) • [🐛 Report issues](https://github.com/sugyan/claude-code-webui/issues) • [💬 Discussions](https://github.com/sugyan/claude-code-webui/discussions)

</div>
