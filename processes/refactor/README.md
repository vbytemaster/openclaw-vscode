# Refactor Process

Read order:
1. [common.md](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/processes/refactor/common.md)
2. [files.md](/Users/vladimirtarnakin/.openclaw/workspace/Projects/OpenClaw/openclaw-vscode/processes/refactor/files.md)

Use this process when:
- splitting large files;
- moving logic to the correct layer;
- removing shims or compatibility paths;
- extracting helpers, stores, view-models, or provider/controller modules.

Primary rule:
- preserve behavior first, improve structure second, remove the old path last.
