# New Component Render Rules

Render rules:
- renderer composes components;
- renderer does not infer semantic meaning;
- markdown helpers do not become business logic containers.

For operational UI:
- running/done/error must come from semantic state;
- disclosure/open state must survive rerenders;
- same data should not have separate collapsed and expanded ad hoc render paths.
