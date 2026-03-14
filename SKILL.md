---
name: openclaw-vscode
description: OpenClaw VS Code/Cursor workflow: propose file changes via pending-changes JSON for human review, and use the extension chat/sidebar features. Use when working in projects that require review approval via review-policy.json.
---

# OpenClaw VS Code

Propose file changes as JSON files for human review in VS Code/Cursor. Never edit source files directly in review-required projects.

## When to use

Before ANY file modification, check `review-policy.json` in workspace root:
- Project in `reviewRequired` → use this skill (propose via JSON)
- Project in `directEditAllowed` or absent → edit directly
- User explicitly allows direct edits in session → edit directly

## How to propose a change

Write a JSON file to `.openclaw/pending-changes/<id>.json`:

```json
{
  "id": "unique-id",
  "file": "path/relative/to/project-root",
  "description": "Brief description of the change",
  "action": "edit",
  "oldText": "exact text to find",
  "newText": "replacement text",
  "timestamp": 1708300000000
}
```

### Actions

**edit** — Surgical find & replace:
```json
{
  "id": "fix-typo",
  "file": "src/app.ts",
  "description": "Fix typo in init",
  "action": "edit",
  "oldText": "console.log(\"helo\")",
  "newText": "console.log(\"hello\")",
  "timestamp": 1708300000000
}
```

**edit** — Multi-hunk (multiple changes in one file):
```json
{
  "id": "refactor-utils",
  "file": "src/utils.ts",
  "description": "Refactor utilities",
  "action": "edit",
  "edits": [
    { "oldText": "function old1()", "newText": "function new1()", "description": "Rename old1" },
    { "oldText": "function old2()", "newText": "function new2()", "description": "Rename old2" }
  ],
  "timestamp": 1708300000000
}
```

**create** — New file:
```json
{
  "id": "add-helper",
  "file": "src/utils/helper.ts",
  "description": "Add helper utility",
  "action": "create",
  "fullContent": "export function helper() { return true; }",
  "timestamp": 1708300000000
}
```

**delete** — Remove file:
```json
{
  "id": "remove-old",
  "file": "src/old-module.ts",
  "description": "Remove deprecated module",
  "action": "delete",
  "timestamp": 1708300000000
}
```

## Scripts — ОБЯЗАТЕЛЬНО используй вместо ручного JSON

All scripts are in `{baseDir}/scripts/`. Use them instead of writing JSON manually.

### propose.js — Create a pending change
```bash
# Single edit
node {baseDir}/scripts/propose.js <project> edit \
  --file "path/to/file" --old 'old text' --new 'new text' \
  --desc "description" [--id "custom-id"]

# Multi-hunk (pipe JSON array to stdin)
echo '[{"oldText":"a","newText":"b","description":"fix"}]' | \
  node {baseDir}/scripts/propose.js <project> edit-multi --file "path" --desc "desc"

# Create new file
node {baseDir}/scripts/propose.js <project> create \
  --file "path" --content @/tmp/file.txt --desc "desc"

# Delete file
node {baseDir}/scripts/propose.js <project> delete --file "path" --desc "desc"
```
- Validates oldText against real file (fails if not found)
- Auto-generates id and timestamp
- `@path` reads content from file

### list.js — List pending changes
```bash
node {baseDir}/scripts/list.js <project>
```

### validate.js — Validate all pending changes
```bash
node {baseDir}/scripts/validate.js <project>
```
- Checks JSON validity, required fields, oldText matching
- Detects conflicts (multiple changes to same file)

### clean.js — Remove all pending changes
```bash
node {baseDir}/scripts/clean.js <project> [--dry-run]
```

## Rules

1. **ALWAYS use scripts** — never write JSON manually. Scripts ensure deterministic behavior across all models.
2. **BEFORE creating any change** — run `list.js <project>` to check existing pending changes. If there are changes for the same file, decide: update/replace the existing one, or skip. NEVER create a conflicting change without cleaning the old one first (`clean.js` or manual removal).
3. **AFTER creating a change** — run `validate.js <project>` to verify oldText matches the actual file. If validation fails, fix immediately — don't tell the user "it's ready" when it's broken.
4. `file` is relative to **project root** (not workspace root).
5. Prefer surgical `oldText`/`newText` over `fullContent` — easier to review per-hunk.
6. After proposing, tell the user what you proposed and wait for review.
7. When updating a previously accepted change (file already modified), re-read the file to get current content for oldText. Previous oldText is stale.
8. For chat image attachments from the VS Code/Cursor extension, resolve paths relative to the **active project root** first: `<project>/.openclaw/images/<filename>`. Do not assume `<workspace>/.openclaw/images`.
9. If an attachment path is provided as `.openclaw/images/<filename>` and file is not found, locate the project root (from context/review-policy) and retry under that project before reporting missing file.
10. Project-specific rules are markdown files in `<project>/.openclaw/rules/`. When user asks to follow/check “rules”, inspect that directory for applicable `.md` files.

## review-policy.json format

See [references/policy-format.md]({baseDir}/references/policy-format.md) for the policy file schema.

## AI Chat Sidebar

The extension includes an AI chat sidebar connected to OpenClaw agent. See [references/chat-features.md]({baseDir}/references/chat-features.md) for details on:
- Image attachments (paste/drop screenshots)
- Reference chips from AI responses (📌 Open in Editor)
- Persistent chat history across tab switches and Cursor restarts
- Code reference pasting from editor

## VS Code/Cursor Extension

The companion extension watches `.openclaw/pending-changes/` and provides:
- Sidebar with pending changes list
- Inline diff preview with hunk navigation
- Accept ✅ / Reject ❌ buttons (per hunk, per file, or all)
- Status bar counter
- AI chat with streaming responses

Extension source: `openclaw-vscode/` in workspace. Build: `npm run compile && npx vsce package --no-dependencies`.
