# New Feature State

When feature data reaches webview:
- state is the first runtime owner;
- view-model derives UI-ready shape from state;
- components consume props only.

Required questions:
- what state must persist?
- what state is transient?
- what is semantic state versus UI-only disclosure state?

Do not:
- encode runtime state in DOM;
- infer missing business meaning during render;
- add component-local hidden state for shared workflow data.
