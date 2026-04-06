# Event Pipeline Bridge Rules

Bridge rules:
- host builders are validated;
- webview inbound parsing is validated;
- `ChatEvent` is the semantic boundary between gateway data and UI-facing data.

If a new event field is needed:
1. add it to normalization first;
2. then map it into the webview DTO;
3. then consume it in state/view-model.
