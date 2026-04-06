# New Component File Placement

Place components by role:
- primitives: reusable structural building blocks
- operational: tool/activity/feed-specific UI
- content: answer/code/diff/table presentation

Place supporting logic by role:
- state in `src/webview/state/`
- view-model in `src/webview/view-models/`
- styles in `src/webview/styles/`

Do not introduce flat compatibility modules when a target directory already exists.
