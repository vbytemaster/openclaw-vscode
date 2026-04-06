# Processes

This directory contains mandatory task-specific workflow rules.

Use this index before implementation work:

- new feature or behavior change:
  [new-feature/README.md](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/processes/new-feature/README.md)
- architecture cleanup or extraction:
  [refactor/README.md](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/processes/refactor/README.md)
- new or changed webview component:
  [new-component/README.md](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/processes/new-component/README.md)
- gateway/chat/webview event flow:
  [event-pipeline/README.md](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/processes/event-pipeline/README.md)
- tests, verify gates, CI:
  [testing/README.md](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/processes/testing/README.md)

## Routing Rules

1. Pick the primary process from the list above.
2. Read that process `README.md` first.
3. Read `common.md` next.
4. Read any additional linked files required by the task.

For cross-cutting work, use this order:
1. primary task process
2. dependent architecture process
3. testing process

Examples:
- new tool-driven feature:
  `new-feature -> event-pipeline -> testing`
- webview component extraction:
  `new-component -> refactor -> testing`
- semantic event cleanup:
  `event-pipeline -> refactor -> testing`

## Module Contract

Each process module should answer:
- when to use it;
- what layers/files it usually affects;
- what is forbidden;
- what order of work to follow;
- what verification is mandatory.
