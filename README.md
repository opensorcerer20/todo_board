# Task Board

A personal task-management app for one-time tasks, recurring habits, and multi-step projects. Built with Preact, TypeScript, Vite, and IndexedDB — everything runs client-side, no backend required.

> **About this project (for recruiters).** This is a portfolio piece demonstrating **AI-assisted development**. The application was built end-to-end using [Claude Code](https://claude.com/claude-code) as a pair-programming tool — but "AI-assisted" here means *directed*, not *auto-generated*. I owned the architecture, the data model, the test strategy, and the review of every change. The sections below document both what the app does and **how I worked with an AI agent to build it well** — the guardrails I set, the decisions I made, and the workflow I followed. That workflow is the thing I'm actually showcasing.

---

## How this was built with AI

The goal wasn't to prove an AI can emit code — everyone knows it can. The goal was to show I can **drive an agent to a maintainable result**: making the architectural calls myself, constraining the agent where it needed constraining, and reviewing output rather than rubber-stamping it.

### I set explicit guardrails for the agent

The repo contains a [`CLAUDE.md`](CLAUDE.md) file — persistent project instructions the agent reads on every session. The most important rule in it is a **test-integrity policy**:

> When a unit test fails, do **not** modify the test or the implementation to make it pass unless I explicitly ask. Instead: report which test failed, investigate the root cause, propose options, and wait for go-ahead.

This exists because the default failure mode of an eager coding agent is to "make the red go green" — deleting an assertion or weakening a check to force a pass. That instruction flips the agent's behavior from *satisfy the test runner* to *surface the real problem to me*. Setting up that kind of guardrail is the difference between AI-assisted code you can trust and AI-assisted code you can't.

### I directed the architecture, the agent implemented it

The decisions that shape this codebase were mine, and I held the agent to them:

- **A single type-discriminated store** instead of separate tables per task type (see [Type hierarchy](#type-hierarchy)).
- **`completedAt` as a nullable date string, not a boolean** — so the exact completion date is always recoverable.
- **A single source of truth for display labels** (`DayNightLabel` in `src/types.ts`) so a label change is a one-line edit, not a find-and-replace.
- **End-to-end tests over unit tests**, because all meaningful behavior in this app only exists in a browser context (see [Testing](#testing)).

### I worked in a real Git workflow

Development happened over ~2 weeks across feature branches merged via pull request (`new-ui`, `new-log-strategy`), not a single dump of generated code. Each branch was a coherent unit of work I reviewed before merging — the same discipline I'd apply on a team.

---

## What it does

### Task types

- **Tasks** — one-time items. Check them off to complete; completed tasks show crossed out until midnight, then drop off the list.
- **Repeat Tasks (habits)** — recurring items with a configurable reset schedule (daily or a specific weekday) and a **log mode**: *log today's date* (mark off as you go) or *log yesterday's date* (log the morning after). Once logged, a habit locks until its next reset cycle. Each log stores both the action date (when you clicked) and the recorded date (today or yesterday).
- **Multistep Projects** — projects made of ordered steps, each step a task in its own right. A progress bar tracks completion; steps can be reordered at creation. Active and deferred projects live in separate columns.

### Metadata

| Field | Applies to | Effect |
|---|---|---|
| **Starred** `★` | Tasks, habits, steps | Pins high-priority items to the top and into a dedicated `★ Pinned · do first` group. |
| **Work/Errand · Personal** | Tasks, habits, steps | Tags an item to a time-of-day domain, shown as a `☀️ Work/Errand` or `🌙 Personal` badge. |
| **Deferred** | Projects | Parks a project in the Deferred column and hides it from the Home dashboard. |

### Home dashboard

A read-only daily view with a Work/Errand · Personal toggle that filters the whole page. It surfaces incomplete tasks (starred first), habits with live **streak counters**, and active projects with progress bars and the current step highlighted.

### Other

- **Export** — one click downloads all IndexedDB records as a dated JSON file for backup or migration.
- **Light / Dark mode** — persisted to `localStorage`.

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | Preact 10 + TSX |
| Build | Vite 5 |
| Language | TypeScript 5 (strict) |
| Storage | IndexedDB (single type-discriminated store) |
| Tests | Playwright (61 end-to-end tests) |

---

## Type hierarchy

All task-like things share a `SimpleTask` base (`id`, `type`, `title`, `completedAt`, `createdAt`). Metadata is added at the level where it makes sense:

```
SimpleTask
├── PlainTask        (type: 'task',      id: number,      + starred, dayNight)
├── MultistepTask    (type: 'task',      id: string UUID, + starred, dayNight, deferred)  ← embedded steps only
├── RepeatedTask     (type: 'repeated',  id: number,      + starred, dayNight, logMode, logs)
└── MultiStepProject (type: 'multistep', id: number,      + deferred, steps: MultistepTask[])
```

`MultiStepProject` deliberately has no `starred` / `dayNight` — those belong to its individual steps. `completedAt` is `string | null` (`YYYY-MM-DD`) rather than a boolean so the exact completion date is always known.

---

## Testing

All 61 tests are Playwright end-to-end tests running against real Chromium. This is the correct layer for this app: every meaningful behavior — IndexedDB reads/writes, DOM interaction, derived state like streaks — only exists in a browser context, so there's no pure-logic layer worth isolating separately. **Each test gets a fresh browser context** (and therefore a fresh IndexedDB), so there's no shared state to reset between tests.

| Suite | Tests | Covers |
|---|---|---|
| `tasks.spec.ts` | 4 | Core CRUD: add, delete, complete, uncomplete |
| `editing.spec.ts` | 12 | Edit modal across all three task types |
| `metadata.spec.ts` | 10 | Starred, domain badges, deferred behavior |
| `requests.spec.ts` | 14 | Request items and their Home-tab placement |
| `export.spec.ts` | 8 | JSON export shape and completeness |
| `streak.spec.ts` | 6 | Streak math for both log modes |
| `logmode.spec.ts` | 6 | Today vs. yesterday logging semantics |
| `home.spec.ts` | 1 | Domain/step interaction regression |

The streak and log-mode suites are the most interesting: they verify the one-day **anchor shift** for `logMode: 'yesterday'` habits, where "logged yesterday" maps to "recorded two days ago" and must still count as an active streak. Logs are injected directly into IndexedDB via `page.evaluate()` rather than clicking the Log button repeatedly.

---

## Running it

```bash
npm install
npm run dev        # dev server at localhost:5173
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm test           # run the 61 Playwright tests
npm run test:ui    # Playwright interactive UI
```
