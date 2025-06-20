# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.1.16](https://github.com/sugyan/claude-code-webui/compare/v0.1.15...v0.1.16) - 2025-06-20
- Add Lefthook for automated code quality enforcement by @sugyan in https://github.com/sugyan/claude-code-webui/pull/74
- Add Playwright demo recording automation with dark mode support by @sugyan in https://github.com/sugyan/claude-code-webui/pull/77

## [v0.1.15](https://github.com/sugyan/claude-code-webui/compare/v0.1.14...v0.1.15) - 2025-06-19
- Update claude-code dependency to 1.0.27 by @sugyan in https://github.com/sugyan/claude-code-webui/pull/60
- Add DemoPage component with mock response system (#63) by @sugyan in https://github.com/sugyan/claude-code-webui/pull/69
- Implement demo automation hook and typing animations by @sugyan in https://github.com/sugyan/claude-code-webui/pull/70
- Fix demo permission dialogs and add visual feedback by @sugyan in https://github.com/sugyan/claude-code-webui/pull/71
- Fix IME composition Enter key triggering unintended message submission by @sugyan in https://github.com/sugyan/claude-code-webui/pull/73

## [v0.1.14](https://github.com/sugyan/claude-code-webui/compare/v0.1.13...v0.1.14) - 2025-06-18
- Refactor frontend with modular architecture for improved maintainability by @sugyan in https://github.com/sugyan/claude-code-webui/pull/56
- Add project directory selection feature by @sugyan in https://github.com/sugyan/claude-code-webui/pull/59

## [v0.1.13](https://github.com/sugyan/claude-code-webui/compare/v0.1.12...v0.1.13) - 2025-06-17
- feat: add abort functionality for streaming responses by @sugyan in https://github.com/sugyan/claude-code-webui/pull/51
- Add permission handling for tool usage with user dialog by @sugyan in https://github.com/sugyan/claude-code-webui/pull/54

## [v0.1.12](https://github.com/sugyan/claude-code-webui/compare/v0.1.11...v0.1.12) - 2025-06-15
- feat: Show 'Claude Code initialized' message only once per session by @sugyan in https://github.com/sugyan/claude-code-webui/pull/42
- feat: Add timestamps to chat messages by @sugyan in https://github.com/sugyan/claude-code-webui/pull/44
- feat: simplify system messages with collapsible details by @sugyan in https://github.com/sugyan/claude-code-webui/pull/46
- Improve tool message display: simplify tool_use and add tool_result support by @sugyan in https://github.com/sugyan/claude-code-webui/pull/48
- chore: Update README.md by @sugyan in https://github.com/sugyan/claude-code-webui/pull/49

## [v0.1.11](https://github.com/sugyan/claude-code-webui/compare/v0.1.10...v0.1.11) - 2025-06-14
- Remove Windows support since @anthropic-ai/claude-code doesn't support Windows by @sugyan in https://github.com/sugyan/claude-code-webui/pull/40

## [v0.1.10](https://github.com/sugyan/claude-code-webui/compare/v0.1.9...v0.1.10) - 2025-06-14
- Fix streaming state bug and update backend dependencies by @sugyan in https://github.com/sugyan/claude-code-webui/pull/35
- feat: replace custom Claude types with official SDK types and optimize serialization by @sugyan in https://github.com/sugyan/claude-code-webui/pull/37
- feat: implement session continuity using Claude Code SDK resume functionality by @sugyan in https://github.com/sugyan/claude-code-webui/pull/39

## [v0.1.9](https://github.com/sugyan/claude-code-webui/compare/v0.1.8...v0.1.9) - 2025-06-14
- Replace CLI subprocess approach with Claude Code SDK by @sugyan in https://github.com/sugyan/claude-code-webui/pull/19
- Format config files with Prettier for consistency by @sugyan in https://github.com/sugyan/claude-code-webui/pull/22
- Update documentation to reflect Claude Code SDK usage by @sugyan in https://github.com/sugyan/claude-code-webui/pull/28
- Implement auto-scroll to bottom for new messages by @sugyan in https://github.com/sugyan/claude-code-webui/pull/27
- Implement bottom-to-top message flow layout by @sugyan in https://github.com/sugyan/claude-code-webui/pull/31
- Add debug mode to backend with --debug flag and DEBUG environment variable support by @sugyan in https://github.com/sugyan/claude-code-webui/pull/33

## [v0.1.8](https://github.com/sugyan/claude-code-webui/compare/v0.1.7...v0.1.8) - 2025-06-13
- Implement multiline input with Shift+Enter support by @sugyan in https://github.com/sugyan/claude-code-webui/pull/12
- Implement message layout redesign with left/right alignment and chat bubbles by @sugyan in https://github.com/sugyan/claude-code-webui/pull/15
- Fix documentation discrepancies and add security warnings by @sugyan in https://github.com/sugyan/claude-code-webui/pull/16

## [v0.1.7](https://github.com/sugyan/claude-code-webui/compare/v0.1.6...v0.1.7) - 2025-06-12
- Fix Windows build failure by replacing symlink with file copy by @sugyan in https://github.com/sugyan/claude-code-webui/pull/8

## [v0.1.6](https://github.com/sugyan/claude-code-webui/compare/v0.1.5...v0.1.6) - 2025-06-12
- Fix binary resource bundling and update binary naming by @sugyan in https://github.com/sugyan/claude-code-webui/pull/6

## [v0.1.5](https://github.com/sugyan/claude-code-webui/compare/v0.1.4...v0.1.5) - 2025-06-12
- Fix tagpr workflow to use GH_PAT for checkout by @sugyan in https://github.com/sugyan/claude-code-webui/pull/4

## [v0.1.4](https://github.com/sugyan/claude-code-webui/compare/v0.1.3...v0.1.4) - 2025-06-12
- Add changelog and pull request workflow by @sugyan in https://github.com/sugyan/claude-code-webui/pull/1
- Add tagpr integration for automated release PRs by @sugyan in https://github.com/sugyan/claude-code-webui/pull/2

## [Unreleased]

### Added

- Pull request based development workflow
- Changelog tracking for better release management
- tagpr integration for automated release PR generation
- Repository ruleset for branch protection
- Dynamic version reading from VERSION file in --version command

### Changed

- Release process now uses PRs with automated version management
- VERSION file moved to backend/ directory for better integration

## [0.1.3] - 2025-06-11

### Added

- True single binary distribution with embedded frontend assets
- Command line interface with `--port`, `--help`, `--version` options
- Startup validation to check Claude CLI availability
- Cross-platform automated releases for Linux (x64/ARM64), macOS (x64/ARM64), Windows (x64)
- GitHub Actions workflow for automated releases on git tags
- Comprehensive documentation for installation and usage

### Changed

- Migrated from basic HTTP handler to Hono framework for better middleware support
- Frontend assets are now bundled into the binary for self-contained execution
- Updated release workflow to use softprops/action-gh-release@v2 with proper permissions

### Fixed

- Windows build issues in GitHub Actions (PowerShell multiline command parsing)
- Release workflow permissions (added `contents: write`)
- Test warnings and errors by mocking fetch API
- TypeScript lint errors in test files

## [0.1.0] - 2025-06-11

### Added

- Initial web-based interface for Claude CLI tool
- Real-time streaming response display
- React frontend with TailwindCSS styling
- Deno backend with TypeScript
- Support for different Claude message types (system, assistant, result)
- Dark/light theme toggle
- Comprehensive test suite with Vitest and Testing Library
- CI/CD pipeline with GitHub Actions

### Technical Details

- Backend serves on port 8080 (configurable)
- Frontend serves on port 3000 in development
- Uses WebSocket-like streaming for real-time responses
- Executes `claude --output-format stream-json --verbose -p <message>`
- Cross-platform support (Linux, macOS, Windows)

[Unreleased]: https://github.com/sugyan/claude-code-webui/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/sugyan/claude-code-webui/compare/v0.1.0...v0.1.3
[0.1.0]: https://github.com/sugyan/claude-code-webui/releases/tag/v0.1.0
