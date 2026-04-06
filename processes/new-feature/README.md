# New Feature Process

Read order:
1. [common.md](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/processes/new-feature/common.md)
2. [state.md](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/processes/new-feature/state.md)
3. [bridge.md](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/processes/new-feature/bridge.md)

Use this process when:
- adding a new user-visible behavior;
- adding a new gateway/webview capability;
- extending the chat workflow with new data or UI.

Primary rule:
- every feature must fit the canonical flow:
  `Gateway DTO -> ChatEvent -> Webview DTO -> Webview State/ViewModel`

Do not start at render or styles.
