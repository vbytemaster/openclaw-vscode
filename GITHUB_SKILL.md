# OpenClaw VS Code Skill

`openclaw-vscode` is a companion VS Code/Cursor extension + workflow that lets AI agents propose code changes for human review before applying them.

## What problem it solves

When a project requires controlled edits (review-first flow), agents should not modify source files directly. Instead, they create structured proposals in `.openclaw/pending-changes/*.json`, and a human reviews/accepts/rejects each change in the IDE.

## Core features

- Pending changes sidebar in VS Code/Cursor
- Per-file and per-hunk diff review
- Accept/Reject actions (single or bulk)
- AI chat panel with OpenClaw Gateway
- Multi-chat support with per-chat agent selection
- Streaming responses + metadata chips (`Open in Editor`, agent, model)

## How to use

1. Install/build extension
2. Ensure project has `.openclaw/pending-changes/`
3. Agent proposes changes via scripts in `scripts/`
4. Reviewer accepts/rejects changes in IDE

## Build locally

### Linux/macOS
```bash
./build.sh
```

### Windows
```bat
build.bat
```

## Repository structure (high-level)

- `src/review/*` — pending changes review engine
- `src/chat/*` — gateway chat provider/api/html
- `src/webview/*` — modular webview client
- `src/shared/*` — shared types + logger
- `scripts/*` — tooling for pending-changes workflow

## Notes

- Keep generated artifacts out of Git (`node_modules`, `out`, `*.vsix`, `.openclaw`).
- Use `SKILL.md` for agent runtime instructions.
- Use this file (`GITHUB_SKILL.md`) as a concise public description on GitHub.
