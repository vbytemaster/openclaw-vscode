# Refactor File Rules

File expectations:
- most files should stay under ~300 lines;
- files approaching ~400 lines need explicit scrutiny;
- files over ~500 lines require strong justification.

Refactor targets to prefer:
- `state/*`
- `view-models/*`
- `components/*`
- `provider/*`
- `events/*`

Anti-pattern:
- one module owning orchestration plus normalization plus render plus styles.
