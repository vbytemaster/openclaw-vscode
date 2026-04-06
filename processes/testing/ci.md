# Testing CI Rules

CI should stay simple and deterministic.

Current required gate:
- install dependencies;
- run `pnpm verify`.

Do not:
- add slow or flaky checks without clear value;
- make CI and local verification diverge;
- rely on manual reviewer memory instead of machine-enforced checks for core architecture rules.
