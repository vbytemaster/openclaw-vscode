# OpenClaw Review 🐅

Review, accept or reject file changes proposed by your OpenClaw agent — directly in VS Code.

## How it works

1. OpenClaw writes change proposals as JSON files to `.openclaw/pending-changes/`
2. The extension watches that directory and shows pending changes in the sidebar
3. Click a change to see an inline diff
4. Accept ✅ or Reject ❌ each change (or all at once)

## Change file format

`.openclaw/pending-changes/<id>.json`:

```json
{
  "id": "fix-typo-01",
  "file": "src/app.ts",
  "description": "Fix typo in init function",
  "action": "edit",
  "oldText": "console.log(\"old\")",
  "newText": "console.log(\"new\")",
  "timestamp": 1708300000000
}
```

### Actions

- **edit** — surgical find & replace (`oldText` → `newText`) or full rewrite (`fullContent`)
- **create** — new file (`fullContent` or `newText`)
- **delete** — remove file

## Install / Build

```bash
cd openclaw-vscode
pnpm install
pnpm verify
pnpm package
# Install the .vsix in Cursor/VS Code: Extensions → ⋯ → Install from VSIX
```

## Engineering Workflow

```bash
pnpm verify
```

Key project docs:

- Architecture and repository-wide rules: `AGENTS.md`
- Task-specific workflow rules: `processes/README.md`
- CI runs the same local quality gate via `pnpm verify`
