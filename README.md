# OpenClaw Review 🐅

Review, accept or reject file changes proposed by your OpenClaw agent — directly in VS Code / Cursor.

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
./build.sh
# or on Windows: build.bat
# Install the .vsix in Cursor/VS Code: Extensions → ⋯ → Install from VSIX
```

Manual steps (if needed):

```bash
npm ci
npm run compile
npm run package
```

## Pending Changes tooling (for agents / CLI)

This repo now contains the pending-changes scripts at:

- `scripts/propose.js`
- `scripts/list.js`
- `scripts/validate.js`
- `scripts/clean.js`

Examples:

```bash
# List pending changes for a project
npm run pending:list -- agents-backend

# Validate pending changes
npm run pending:validate -- agents-backend

# Create a change (see SKILL.md for full options)
node scripts/propose.js agents-backend edit \
  --file "src/app.py" --old "a" --new "b" --desc "test"
```
