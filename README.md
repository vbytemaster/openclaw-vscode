# OpenClaw VS Code

VS Code extension for chatting with an OpenClaw Gateway from a sidebar webview.

## What It Does

- adds an `OpenClaw VS Code` view container to the activity bar
- renders a chat webview in the `Chat` view
- connects to an OpenClaw Gateway over `ws` or `http`
- streams assistant responses and tool activity into the webview
- supports session continuity, agent selection, and workspace context injection

## Requirements

- VS Code `^1.85.0`
- Node.js 20+
- `pnpm`
- a running OpenClaw Gateway

## Extension Settings

The extension contributes these settings:

- `openclaw-vscode.chat.host`
- `openclaw-vscode.chat.port`
- `openclaw-vscode.chat.token`
- `openclaw-vscode.chat.agentId`
- `openclaw-vscode.chat.sessionUser`
- `openclaw-vscode.chat.requestTimeoutMs`
- `openclaw-vscode.chat.streamStartTimeoutMs`
- `openclaw-vscode.chat.streamInactivityTimeoutMs`
- `openclaw-vscode.chat.injectStartupContext`
- `openclaw-vscode.chat.transport`

Default transport is `ws`. `http` is kept as a fallback/debug path.

## Local Development

Install dependencies:

```bash
pnpm install
```

Run the quality gate:

```bash
pnpm verify
```

Useful commands:

```bash
pnpm test
pnpm test:watch
pnpm compile
pnpm package
```

`pnpm verify` runs:

- unit tests
- extension TypeScript typecheck
- webview TypeScript typecheck
- full compile

## Packaging

Build a VSIX:

```bash
pnpm package
```

Then install the generated `.vsix` in VS Code or Cursor via `Extensions -> ... -> Install from VSIX`.

## Project Structure

High-level layout:

- `src/dto/`:
  protocol boundary schemas
- `src/chat/`:
  application orchestration, sessions, transport/webview routing
- `src/chat/events/`:
  semantic event normalization
- `src/gateway/`:
  gateway-specific connection helpers
- `src/webview/`:
  webview state, view-models, controllers, rendering
- `processes/`:
  mandatory task-specific workflow rules

## Engineering Rules

Repository-wide architecture rules live in [AGENTS.md](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/AGENTS.md).

Task-specific implementation processes live in [processes/README.md](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/processes/README.md).

Mandatory feature flow:

`Gateway DTO -> ChatEvent -> Application/Session -> Webview DTO -> Webview State -> ViewModel -> Components -> Styles`

## CI

GitHub Actions runs the same local quality gate through `pnpm verify`.

Workflow file:

- [.github/workflows/ci.yml](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/.github/workflows/ci.yml)
