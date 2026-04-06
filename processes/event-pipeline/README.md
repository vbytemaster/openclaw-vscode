# Event Pipeline Process

Read order:
1. [common.md](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/processes/event-pipeline/common.md)
2. [bridge.md](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/processes/event-pipeline/bridge.md)
3. [files.md](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/processes/event-pipeline/files.md)

Use this process when:
- changing gateway DTO parsing;
- changing `ChatEvent` or tool normalization;
- changing host/webview event mapping;
- adding a new semantic event kind or normalized field.

Primary rule:
- semantic mapping happens once in `src/chat/events/*`.
