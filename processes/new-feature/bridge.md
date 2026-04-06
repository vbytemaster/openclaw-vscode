# New Feature Bridge

Use this file when the feature crosses extension host and webview.

Required rules:
- bridge messages are validated DTOs;
- host builders are explicit;
- webview parsers are explicit;
- internal objects do not cross the boundary.

Do not:
- hand-roll ad hoc payloads;
- reuse raw gateway payload as bridge payload;
- leak internal session/store objects through the bridge.
