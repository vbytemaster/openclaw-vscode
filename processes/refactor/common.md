# Refactor Common

Required order of work:
1. identify the violated boundary;
2. extract the clean target module;
3. move callers to the clean target;
4. add or update tests around the moved behavior;
5. delete the legacy path only after callers are migrated.

Do not:
- grow dump files while planning to refactor them later;
- move logic and behavior at the same time unless tests pin the outcome;
- leave two permanent sources of truth.
