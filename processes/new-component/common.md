# New Component Common

Required order of work:
1. identify the component family:
   `primitives`, `operational`, or `content`
2. define or reuse the view-model/props shape;
3. implement component rendering;
4. add styles in the correct style domain;
5. add tests for output-critical behavior.

Do not:
- read store or transport directly from components;
- parse raw payload inside components;
- duplicate action bars or card primitives.
