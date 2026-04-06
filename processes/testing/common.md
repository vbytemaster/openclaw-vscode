# Testing Common

Minimum expectation for non-trivial changes:
- unit tests for the changed semantic behavior;
- no regression in existing tests;
- local verify passes.

Required verification order:
1. targeted tests
2. `pnpm test`
3. `pnpm -s tsc -p ./ --noEmit`
4. `pnpm -s tsc -p tsconfig.webview.json --noEmit`
5. `pnpm -s compile`

Add architecture guard tests when the rule is important enough that prose alone is not sufficient.
