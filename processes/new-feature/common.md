# New Feature Common

Required order of work:
1. define or reuse DTO boundary;
2. define semantic event/state;
3. map to webview DTO;
4. update state and view-model;
5. add or reuse components;
6. add tests;
7. run verify.

Forbidden:
- raw payload in UI;
- direct transport-to-render wiring;
- feature logic inside markdown/render helpers;
- skipping tests for new behavior.

Completion checklist:
- layer fit is explicit;
- no compatibility shortcut was introduced;
- tests cover the new semantic path.
