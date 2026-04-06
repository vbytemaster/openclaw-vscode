# Event Pipeline File Map

Expected homes:
- gateway DTO: `src/dto/gateway/*`
- semantic events: `src/chat/events/*`
- webview DTO: `src/dto/webview/*`
- host/webview bridge: `src/chat/*Bridge*` and `src/chat/webviewMessages.ts`
- webview reducers/view-models: `src/webview/*`

Do not:
- add new event logic to `contracts/*`;
- keep semantic schema only in compatibility layers;
- duplicate normalization in reducers or render helpers.
