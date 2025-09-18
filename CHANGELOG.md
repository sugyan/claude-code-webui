# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.56](https://github.com/sugyan/claude-code-webui/compare/0.1.55...0.1.56) - 2025-09-18
- chore(deps): Bump @hono/node-server from 1.17.0 to 1.19.1 in /backend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/314
- chore(deps): Bump actions/download-artifact from 4.3.0 to 5.0.0 by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/307
- chore(deps): Bump actions/setup-node from 4.4.0 to 5.0.0 by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/306
- chore(deps-dev): Bump esbuild from 0.25.6 to 0.25.9 in /backend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/312
- chore(deps-dev): Bump @types/node from 20.19.4 to 24.3.0 in /backend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/308
- chore(deps-dev): Bump typescript-eslint from 8.33.1 to 8.42.0 in /frontend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/313
- chore(deps-dev): Bump @types/react from 19.1.6 to 19.1.12 in /frontend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/316
- Fix release workflow: Generate version.ts before Deno dependency caching by @sugyan in https://github.com/sugyan/claude-code-webui/pull/317

## [0.1.55](https://github.com/sugyan/claude-code-webui/compare/0.1.54...0.1.55) - 2025-09-18
- chore(deps): Bump hono from 4.8.5 to 4.9.7 in /backend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/288
- chore(deps): Bump esbuild and vitest in /backend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/289
- Add Dependabot configuration with cooldown settings by @sugyan in https://github.com/sugyan/claude-code-webui/pull/290
- chore(deps): Bump @logtape/pretty from 1.0.4 to 1.0.5 in /backend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/300
- chore(deps): Bump Songmu/tagpr from 1.8.4 to 1.9.0 by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/294
- chore(deps): Bump actions/github-script from 7.1.0 to 8.0.0 by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/292
- chore(deps): Bump react-dom and @types/react-dom in /frontend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/303
- chore(deps-dev): Bump eslint from 9.30.1 to 9.34.0 in /backend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/295
- chore(deps): Bump actions/checkout from 4.3.0 to 5.0.0 by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/293
- chore(deps-dev): Bump @tailwindcss/vite from 4.1.8 to 4.1.13 in /frontend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/304
- chore(deps-dev): Bump @typescript-eslint/parser from 8.36.0 to 8.42.0 in /backend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/298
- chore(deps-dev): Bump vitest from 3.2.3 to 3.2.4 in /frontend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/297
- chore(deps-dev): Bump eslint from 9.28.0 to 9.34.0 in /frontend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/299
- chore(deps-dev): Bump vite from 6.3.5 to 7.1.2 in /frontend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/301
- chore(deps-dev): Bump typescript from 5.8.3 to 5.9.2 in /backend by @dependabot[bot] in https://github.com/sugyan/claude-code-webui/pull/302
- Fix dependabot and tagpr labels conflict by @sugyan in https://github.com/sugyan/claude-code-webui/pull/305

## [0.1.54](https://github.com/sugyan/claude-code-webui/compare/0.1.53...0.1.54) - 2025-09-18
- Fix path encoding for Windows usernames with underscores by @BoQsc in https://github.com/sugyan/claude-code-webui/pull/276
- security: Pin GitHub Actions to commit hashes using pinact by @sugyan in https://github.com/sugyan/claude-code-webui/pull/287

## [0.1.53](https://github.com/sugyan/claude-code-webui/compare/0.1.52...0.1.53) - 2025-09-07
- Fix release workflow draft handling and npm OIDC authentication by @sugyan in https://github.com/sugyan/claude-code-webui/pull/274

## [0.1.52](https://github.com/sugyan/claude-code-webui/compare/0.1.51...0.1.52) - 2025-09-07
- Improve release flow with draft releases and OIDC npm publishing by @sugyan in https://github.com/sugyan/claude-code-webui/pull/272

## [0.1.51](https://github.com/sugyan/claude-code-webui/compare/0.1.50...0.1.51) - 2025-09-06
- Fix CollapsibleDetails tool result display with preview functionality by @sugyan in https://github.com/sugyan/claude-code-webui/pull/266
- Improve hooks message display by simplifying system message content by @sugyan in https://github.com/sugyan/claude-code-webui/pull/268
- Update @anthropic-ai/claude-code to v1.0.108 and fix AbortError import by @sugyan in https://github.com/sugyan/claude-code-webui/pull/269
- Fix Claude CLI validation to use fallback instead of exit on detection failure by @sugyan in https://github.com/sugyan/claude-code-webui/pull/270
- Update native binary installation description in README by @sugyan in https://github.com/sugyan/claude-code-webui/pull/271

## [0.1.50](https://github.com/sugyan/claude-code-webui/compare/0.1.49...0.1.50) - 2025-08-31
- fix: unify message processing pipelines between streaming and history by @sugyan in https://github.com/sugyan/claude-code-webui/pull/262
- ci: add build validation and fix claude-code dependency issue by @sugyan in https://github.com/sugyan/claude-code-webui/pull/264

## [0.1.49](https://github.com/sugyan/claude-code-webui/compare/0.1.48...0.1.49) - 2025-08-30
- Implement thinking message display for Claude's reasoning process by @sugyan in https://github.com/sugyan/claude-code-webui/pull/255
- Enhanced TodoWrite display with visual todo list by @sugyan in https://github.com/sugyan/claude-code-webui/pull/259
- chore: update @anthropic-ai/claude-code dependency to 1.0.98 by @sugyan in https://github.com/sugyan/claude-code-webui/pull/260
- docs: optimize CLAUDE.md for better performance by @sugyan in https://github.com/sugyan/claude-code-webui/pull/261

## [0.1.48](https://github.com/sugyan/claude-code-webui/compare/0.1.47...0.1.48) - 2025-08-26
- remove: Select New Directory option from project selector by @sugyan in https://github.com/sugyan/claude-code-webui/pull/241
- Update demo video of README.md by @sugyan in https://github.com/sugyan/claude-code-webui/pull/248
- Add keyboard shortcut for permission mode cycling by @sugyan in https://github.com/sugyan/claude-code-webui/pull/253
- Add unified settings page with theme and enter behavior integration by @sugyan in https://github.com/sugyan/claude-code-webui/pull/254

## [0.1.47](https://github.com/sugyan/claude-code-webui/compare/0.1.46...0.1.47) - 2025-08-22
- fix: improve error handling when Claude CLI path detection fails by @sugyan in https://github.com/sugyan/claude-code-webui/pull/235
- feat: implement always-visible permission mode toggle UI by @sugyan in https://github.com/sugyan/claude-code-webui/pull/237
- feat: implement comprehensive plan mode testing (#137) by @sugyan in https://github.com/sugyan/claude-code-webui/pull/238
- docs: add Permission Mode feature documentation by @sugyan in https://github.com/sugyan/claude-code-webui/pull/239

## [0.1.46](https://github.com/sugyan/claude-code-webui/compare/0.1.45...0.1.46) - 2025-08-13
- feat: implement LogTape logging system for debug log control by @sugyan in https://github.com/sugyan/claude-code-webui/pull/220
- feat: simplify runtime abstraction using Node.js standard modules by @sugyan in https://github.com/sugyan/claude-code-webui/pull/223
- feat: add permission mode support and unify localStorage management (#132) by @sugyan in https://github.com/sugyan/claude-code-webui/pull/226
- feat: Backend Permission Mode Support by @sugyan in https://github.com/sugyan/claude-code-webui/pull/227
- fix: improve logger output by removing emojis and excessive indentation by @sugyan in https://github.com/sugyan/claude-code-webui/pull/229
- feat: complete ExitPlanMode implementation with UI integration by @sugyan in https://github.com/sugyan/claude-code-webui/pull/230
- feat: implement session-scoped permission mode state management by @sugyan in https://github.com/sugyan/claude-code-webui/pull/232
- fix: parse JSON theme value from localStorage in index.html by @sugyan in https://github.com/sugyan/claude-code-webui/pull/233
- feat: update @anthropic-ai/claude-code dependency to 1.0.77 by @sugyan in https://github.com/sugyan/claude-code-webui/pull/234

## [0.1.45](https://github.com/sugyan/claude-code-webui/compare/0.1.44...0.1.45) - 2025-07-31
- feat: make demo page available only in development mode by @sugyan in https://github.com/sugyan/claude-code-webui/pull/217
- fix: add Windows .cmd parsing fallback for node.exe colocated environments by @sugyan in https://github.com/sugyan/claude-code-webui/pull/219

## [0.1.44](https://github.com/sugyan/claude-code-webui/compare/0.1.43...0.1.44) - 2025-07-27
- fix: use absolute URLs for README images to properly display on npm by @sugyan in https://github.com/sugyan/claude-code-webui/pull/215

## [0.1.43](https://github.com/sugyan/claude-code-webui/compare/0.1.42...0.1.43) - 2025-07-27
- Update video URL of README.md by @sugyan in https://github.com/sugyan/claude-code-webui/pull/212
- fix: include images in npm package for README display by @sugyan in https://github.com/sugyan/claude-code-webui/pull/214

## [0.1.42](https://github.com/sugyan/claude-code-webui/compare/0.1.41...0.1.42) - 2025-07-27
- fix: include docs/ directory in npm package for README images by @sugyan in https://github.com/sugyan/claude-code-webui/pull/207
- fix: add permissions to demo-comparison workflow for issue creation by @sugyan in https://github.com/sugyan/claude-code-webui/pull/209
- chore: cleanup documentation and remove unused files by @sugyan in https://github.com/sugyan/claude-code-webui/pull/210

## [0.1.41](https://github.com/sugyan/claude-code-webui/compare/0.1.40...0.1.41) - 2025-07-26
- feat: replace blocking modal permission dialog with inline interface by @sugyan in https://github.com/sugyan/claude-code-webui/pull/203
- feat: add comprehensive README screenshots with optimized layout by @sugyan in https://github.com/sugyan/claude-code-webui/pull/205
- chore: update @anthropic-ai/claude-code to version 1.0.61 by @sugyan in https://github.com/sugyan/claude-code-webui/pull/206

## [0.1.40](https://github.com/sugyan/claude-code-webui/compare/0.1.39...0.1.40) - 2025-07-22
- feat: comprehensive Windows compatibility and configuration improvements by @sugyan in https://github.com/sugyan/claude-code-webui/pull/199
- feat: add comprehensive GitHub issue templates by @sugyan in https://github.com/sugyan/claude-code-webui/pull/202

## [0.1.39](https://github.com/sugyan/claude-code-webui/compare/0.1.38...0.1.39) - 2025-07-20
- feat: add Claude Code hooks for automatic prettier formatting by @sugyan in https://github.com/sugyan/claude-code-webui/pull/196
- feat: improve Windows path handling for cross-platform compatibility by @sugyan in https://github.com/sugyan/claude-code-webui/pull/198

## [0.1.38](https://github.com/sugyan/claude-code-webui/compare/0.1.37...0.1.38) - 2025-07-19
- Change version option from -V to -v to match Claude CLI by @sugyan in https://github.com/sugyan/claude-code-webui/pull/189
- feat: add comprehensive Windows support by @sugyan in https://github.com/sugyan/claude-code-webui/pull/193
- fix: resolve asdf shim paths for Claude Code SDK compatibility by @sugyan in https://github.com/sugyan/claude-code-webui/pull/191
- feat: Universal Claude CLI path detection with detectClaudeCliPath by @sugyan in https://github.com/sugyan/claude-code-webui/pull/194
- feat: simplify Node.js runtime with Hono v1.17.0 absolute path support by @sugyan in https://github.com/sugyan/claude-code-webui/pull/195

## [0.1.37](https://github.com/sugyan/claude-code-webui/compare/0.1.36...0.1.37) - 2025-07-14
- docs: improve npm installation documentation and badge layout by @sugyan in https://github.com/sugyan/claude-code-webui/pull/184
- feat: add Windows support for Claude Code WebUI by @sugyan in https://github.com/sugyan/claude-code-webui/pull/186
- docs: update CLAUDE.md to reflect current implementation by @sugyan in https://github.com/sugyan/claude-code-webui/pull/187

## [0.1.36](https://github.com/sugyan/claude-code-webui/compare/0.1.35...0.1.36) - 2025-07-13
- feature: Add Enter behavior toggle feature for chat input by @xiaocang in https://github.com/sugyan/claude-code-webui/pull/173
- feat: implement dual linting strategy for backend with Deno/ESLint by @sugyan in https://github.com/sugyan/claude-code-webui/pull/182

## [0.1.35](https://github.com/sugyan/claude-code-webui/compare/0.1.34...0.1.35) - 2025-07-12
- fix: resolve static path for npm global installation by @sugyan in https://github.com/sugyan/claude-code-webui/pull/177
- fix: add prepack script to include README and LICENSE in npm package by @sugyan in https://github.com/sugyan/claude-code-webui/pull/180

## [0.1.34](https://github.com/sugyan/claude-code-webui/compare/0.1.33...0.1.34) - 2025-07-12
- fix: add shebang to CLI entry point for npm global installation by @sugyan in https://github.com/sugyan/claude-code-webui/pull/175
- fix: added copy frontend before deno compile. by @xiaocang in https://github.com/sugyan/claude-code-webui/pull/174

## [0.1.33](https://github.com/sugyan/claude-code-webui/compare/0.1.32...0.1.33) - 2025-07-11
- fix: unify backend testing to use npm run test by @sugyan in https://github.com/sugyan/claude-code-webui/pull/169

## [0.1.32](https://github.com/sugyan/claude-code-webui/compare/0.1.31...0.1.32) - 2025-07-11
- fix: remove redundant version consistency check from npm publishing workflow by @sugyan in https://github.com/sugyan/claude-code-webui/pull/167

## [0.1.31](https://github.com/sugyan/claude-code-webui/compare/0.1.30...0.1.31) - 2025-07-11
- docs: add --claude-path option to README by @sugyan in https://github.com/sugyan/claude-code-webui/pull/164
- feat: add CI/CD npm publishing automation by @sugyan in https://github.com/sugyan/claude-code-webui/pull/166

## [0.1.30](https://github.com/sugyan/claude-code-webui/compare/0.1.29...0.1.30) - 2025-07-11
- chore: update @anthropic-ai/claude-code to version 1.0.48 by @sugyan in https://github.com/sugyan/claude-code-webui/pull/160
- feat: add --claude-path CLI option with optimized path resolution by @sugyan in https://github.com/sugyan/claude-code-webui/pull/162

## [0.1.29](https://github.com/sugyan/claude-code-webui/compare/0.1.28...0.1.29) - 2025-07-11
- fix: update release workflow to trigger on tags without v prefix by @sugyan in https://github.com/sugyan/claude-code-webui/pull/158

## [0.1.28](https://github.com/sugyan/claude-code-webui/compare/v0.1.28...0.1.28) - 2025-07-11
- feat: implement npm package configuration and TypeScript build setup by @sugyan in https://github.com/sugyan/claude-code-webui/pull/153
- fix: unify static file paths across Deno and Node.js builds by @sugyan in https://github.com/sugyan/claude-code-webui/pull/157

## [v0.1.28](https://github.com/sugyan/claude-code-webui/compare/v0.1.27...v0.1.28) - 2025-07-10
- Add Node.js CLI entry point and runtime support by @sugyan in https://github.com/sugyan/claude-code-webui/pull/144
- Remove runtime branches by abstracting static file serving and path resolution by @sugyan in https://github.com/sugyan/claude-code-webui/pull/146
- fix: resolve permission dialog crash and improve bash builtin handling (#147) by @sugyan in https://github.com/sugyan/claude-code-webui/pull/148

## [v0.1.27](https://github.com/sugyan/claude-code-webui/compare/v0.1.26...v0.1.27) - 2025-07-09
- fix: update release workflow to resolve build failures by @sugyan in https://github.com/sugyan/claude-code-webui/pull/142

## [v0.1.26](https://github.com/sugyan/claude-code-webui/compare/v0.1.25...v0.1.26) - 2025-07-09
- fix: replace unreliable FedericoCarboni/setup-ffmpeg with apt-get install by @sugyan in https://github.com/sugyan/claude-code-webui/pull/121
- docs: update documentation to reflect current implementation by @sugyan in https://github.com/sugyan/claude-code-webui/pull/123
- feat: implement runtime abstraction layer and CLI modernization for backend (Phase 1-5) by @sugyan in https://github.com/sugyan/claude-code-webui/pull/125
- feat: implement Node.js runtime implementation by @sugyan in https://github.com/sugyan/claude-code-webui/pull/139
- fix: resolve compound command permission loop in issue #140 by @sugyan in https://github.com/sugyan/claude-code-webui/pull/141

## [v0.1.25](https://github.com/sugyan/claude-code-webui/compare/v0.1.24...v0.1.25) - 2025-07-04
- Fix compatibility with migrate-installer bash wrapper by @nichiki in https://github.com/sugyan/claude-code-webui/pull/116

## [v0.1.24](https://github.com/sugyan/claude-code-webui/compare/v0.1.23...v0.1.24) - 2025-07-03
- fix: prevent infinite loop in useChatState hook causing demo page crash by @sugyan in https://github.com/sugyan/claude-code-webui/pull/118

## [v0.1.23](https://github.com/sugyan/claude-code-webui/compare/v0.1.22...v0.1.23) - 2025-07-03
- 🔧 Remove unnecessary apt-get update in demo-comparison workflow by @sugyan in https://github.com/sugyan/claude-code-webui/pull/98
- feat: implement conversation history listing API by @sugyan in https://github.com/sugyan/claude-code-webui/pull/105
- feat: implement conversation detail retrieval API (Issue #104) by @sugyan in https://github.com/sugyan/claude-code-webui/pull/107
- refactor: extract endpoint handlers from main.ts for better maintainability by @sugyan in https://github.com/sugyan/claude-code-webui/pull/109
- feat: add history list route and navigation from ChatPage by @sugyan in https://github.com/sugyan/claude-code-webui/pull/114
- feat: enable ChatPage to load and display conversation history by @sugyan in https://github.com/sugyan/claude-code-webui/pull/115
- fix: complete navigation flow and UX improvements for history feature (Issue #113) by @sugyan in https://github.com/sugyan/claude-code-webui/pull/117

## [v0.1.22](https://github.com/sugyan/claude-code-webui/compare/v0.1.21...v0.1.22) - 2025-06-25
- Improve README with modern design and better organization by @sugyan in https://github.com/sugyan/claude-code-webui/pull/93
- Migrate backend CLI from manual parsing to Cliffy framework by @sugyan in https://github.com/sugyan/claude-code-webui/pull/95
- Update Claude Code dependency to v1.0.33 and unify version management by @sugyan in https://github.com/sugyan/claude-code-webui/pull/96
- Fix demo comparison algorithm to use SSIM by @sugyan in https://github.com/sugyan/claude-code-webui/pull/97

## [v0.1.21](https://github.com/sugyan/claude-code-webui/compare/v0.1.20...v0.1.21) - 2025-06-23
- Add --host option to enable network binding by @sugyan in https://github.com/sugyan/claude-code-webui/pull/89
- Fix SPA routing fallback for direct URL access in binary mode by @sugyan in https://github.com/sugyan/claude-code-webui/pull/91
- Update chat message labels and loading animation by @sugyan in https://github.com/sugyan/claude-code-webui/pull/92

## [v0.1.20](https://github.com/sugyan/claude-code-webui/compare/v0.1.19...v0.1.20) - 2025-06-23
- Implement flexible API port configuration (fixes #78) by @sugyan in https://github.com/sugyan/claude-code-webui/pull/87

## [v0.1.19](https://github.com/sugyan/claude-code-webui/compare/v0.1.18...v0.1.19) - 2025-06-22
- Remove branches restriction and increase threshold for demo comparison by @sugyan in https://github.com/sugyan/claude-code-webui/pull/85

## [v0.1.18](https://github.com/sugyan/claude-code-webui/compare/v0.1.17...v0.1.18) - 2025-06-22
- Fix demo comparison workflow timing and URL extraction issues by @sugyan in https://github.com/sugyan/claude-code-webui/pull/83

## [v0.1.17](https://github.com/sugyan/claude-code-webui/compare/v0.1.16...v0.1.17) - 2025-06-22
- Fix demo comparison workflow and release pipeline issues by @sugyan in https://github.com/sugyan/claude-code-webui/pull/81

## [v0.1.16](https://github.com/sugyan/claude-code-webui/compare/v0.1.15...v0.1.16) - 2025-06-22
- Add Lefthook for automated code quality enforcement by @sugyan in https://github.com/sugyan/claude-code-webui/pull/74
- Add Playwright demo recording automation with dark mode support by @sugyan in https://github.com/sugyan/claude-code-webui/pull/77
- Implement automated demo recording CI/CD pipeline (closes #68) by @sugyan in https://github.com/sugyan/claude-code-webui/pull/80

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
