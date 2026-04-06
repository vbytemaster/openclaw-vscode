# AGENTS.md

## Purpose

This file defines the repository-wide engineering rules for this project.

Agents working in this repo must optimize for:
- clean layering;
- explicit boundaries;
- small modules;
- deterministic data flow;
- no UI/transport spaghetti;
- process-first execution for non-trivial work.

This file is intentionally limited to architecture and global rules.
Task-specific workflow rules live in `processes/`.

---

## Scope

Applies to the entire repository.

If existing code violates these rules:
- do not copy the violation into new code;
- prefer incremental refactors toward the target architecture;
- do not add new logic to dump files when a clean module can be introduced instead.

---

## Required Process Routing

Before implementing any non-trivial task, an agent must:
1. identify the task type;
2. open the matching process module in `processes/`;
3. follow that module before making changes.

Required first-read mapping:
- new feature or behavior change: `processes/new-feature/README.md`
- architecture cleanup or extraction: `processes/refactor/README.md`
- new or changed webview component: `processes/new-component/README.md`
- gateway/chat/webview event flow work: `processes/event-pipeline/README.md`
- tests, verify gates, CI, coverage work: `processes/testing/README.md`

If a task spans multiple areas:
- read the primary process first;
- then read the additional process modules it touches;
- preserve the canonical data flow and layer boundaries.

Skipping the applicable process module is a repository rule violation.

---

## Core Principles

1. No raw payloads above DTO boundaries.
2. No UI semantics inside transport.
3. No render-time guessing of event meaning.
4. No giant multi-responsibility files.
5. No quick UI patches that bypass state, view-models, or components.
6. No temporary shortcuts that create a second architecture.
7. New code must move the project toward the target architecture, not away from it.

---

## Target Architecture

### 1. DTO / Schemas

Use protocol-oriented DTO folders:

- `src/dto/gateway/`
- `src/dto/webview/`

Rules:
- DTO are boundary schemas only.
- Use `zod` for runtime validation.
- Group DTO by real protocol/message family.
- Do not place internal semantic models in `src/dto/`.

### 2. Transport / Network

Transport owns:
- websocket connect/send/abort;
- reconnect/session patch;
- raw frame handling.

Transport must not:
- know DOM;
- know CSS;
- create user-facing labels;
- infer tool semantics.

### 3. Event Mapping

`src/chat/events/` owns:
- conversion from gateway DTO to `ChatEvent`;
- tool phase merging by `toolCallId`;
- canonical semantic states:
  - `running`
  - `done`
  - `error`

Rules:
- UI never decides if something is `read`, `search`, `exec`, `write`, and so on.
- Semantic mapping happens exactly once, in event normalization.

### 4. Application / Orchestration

`src/chat/` owns:
- sessions;
- lifecycle orchestration;
- routing between transport and webview;
- request/response flow.

Application layer must not:
- render HTML;
- own CSS;
- parse DOM.

### 5. Webview Bridge

The webview bridge owns:
- host -> webview message builders;
- webview -> host message parsers;
- boundary contracts between extension host and webview.

Rules:
- do not leak internal objects across the bridge;
- do not hand-roll payloads ad hoc.

### 6. Webview State

Target location:
- `src/webview/state/`

State layer owns:
- chat store;
- assistant turn state;
- transient operational feed state;
- disclosure/open state;
- runtime UI state.

Rules:
- state is not render;
- state is not transport;
- state is not CSS.

### 7. View Models

Target location:
- `src/webview/view-models/`

Rules:
- renderers consume view-models;
- view-models consume semantic events/state;
- renderers must not rebuild business meaning by hand.

### 8. Components

Target structure:
- `src/webview/components/primitives/`
- `src/webview/components/operational/`
- `src/webview/components/content/`

Rules:
- components receive props only;
- components do not read transport/state directly;
- components do not parse raw payloads.

### 9. Shell / Styles / Design System

Target structure:
- `src/webview/shell/`
- `src/webview/styles/`

Rules:
- do not accumulate styling in `src/chat/html.ts`;
- use centralized tokens and domain styles;
- do not hardcode one-off dimensions without justification.

---

## Canonical Data Flow

The required feature path is:

`Gateway DTO -> ChatEvent -> Application/Session -> Webview DTO -> Webview State -> ViewModel -> Components -> Styles`

Low-level networking remains separate:

`WebSocket runtime -> Transport -> Event mapping`

This is not a recommendation.
It is the mandatory architecture for new feature work.

Forbidden alternatives:
- `Gateway DTO -> Webview/UI`
- `Gateway DTO -> Renderer`
- `Transport -> UI semantic labels`
- `Raw payload -> Webview DTO`
- `Feature logic -> direct render patch without state/view-model fit`

If a feature does not fit this flow, refactor the design first.

---

## File Size and Responsibility Limits

Hard rule:
- do not create or extend files past ~500 lines without strong justification.

Soft target:
- keep most files under ~300 lines.

If a file grows past ~400 lines, ask:
- is it mixing responsibilities?
- can a new module be introduced instead?
- is this actually a missing layer boundary?

Known anti-pattern:
- one file owning transport + lifecycle + rendering + styling.

---

## Forbidden Shortcuts

Do not:
- read raw gateway payload in UI components;
- build webview DTO directly from raw gateway payload;
- bypass `ChatEvent` when moving data from gateway toward UI;
- infer tool types from display text in render code;
- add new CSS blobs to `src/chat/html.ts` for convenience;
- bypass DTO validation because the payload shape seems obvious;
- store semantic logic in markdown/render helpers;
- patch giant files when a clean module can be introduced;
- add temporary architecture branches without a matching process rule and layer fit.

---

## UI Rules

Operational UI must follow these rules:
- running/done/error are explicit states;
- disclosure state is stable across rerenders;
- closed rows and expanded cards are two states of the same component;
- tables, shell blocks, diffs, and code cards reuse shared primitives;
- timers and animations are throttled and event-driven.

Performance rules:
- do not rerender the whole feed on every micro-update;
- batch UI updates;
- do not autoscroll on every tool event;
- do not rebuild unchanged blocks.

---

## Verification Rule

Implementation is not complete until the relevant checks pass.

Repository-wide baseline:
- `pnpm test`
- `pnpm -s tsc -p ./ --noEmit`
- `pnpm -s tsc -p tsconfig.webview.json --noEmit`
- `pnpm -s compile`

Use `pnpm verify` when a full local gate is needed.

---

## Decision Rule

If there is a tradeoff between a fast patch and preserving architecture:
- prefer the architectural path unless the user explicitly requests a tactical temporary fix.

Even for tactical fixes:
- do not introduce a new violation of the canonical flow if a clean path is reasonably available.
