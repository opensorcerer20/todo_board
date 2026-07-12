# Task Board

A personal task-management app for one-time tasks, recurring habits, and multi-step projects. Built with Preact, TypeScript, Vite, and IndexedDB — everything runs client-side, no backend required.

## Development approach

The app was built with AI-assisted development, using [Claude Code](https://claude.com/claude-code) as a design and pair-programming tool. Architecture, data model, test strategy, and design direction were set up front; the agent handled implementation within those constraints, and its output was reviewed before landing. The notes below cover both what the app does and how it was built.

### Guardrails for the agent

The repo includes a [`CLAUDE.md`](CLAUDE.md) file — persistent project instructions the agent reads on every session. Its key rule is a **test-integrity policy**:

> When a unit test fails, do **not** modify the test or the implementation to make it pass unless explicitly asked. Instead: report which test failed, investigate the root cause, propose options, and wait for go-ahead.

This guards against a common failure mode of coding agents — "making the red go green" by deleting an assertion or weakening a check to force a pass. The policy redirects the agent from satisfying the test runner to surfacing the underlying problem.

### Design direction

#### Initial dashboard
- Light theme, cool slate/neutral palette, Hanken Grotesk + Space Mono.
- Work / Personal split via a toggle that filters the whole board.
- Three task types in one list: simple to-dos, errands (filed under Work), and project current-steps (tagged with project name + step).
- Starred tasks pinned to a highlighted group at the top.
- Active Projects capped at 2, each with a progress bar and current step.
- Habits shown with streak counts — build habits get a today checkmark; avoid ("don't do this") habits show Clean today / Logged yesterday.
- Tweaks: accent color, hide-completed toggle.

#### Night mode
- Full dark palette derived from the light version (near-black page, raised dark cards, brighter periwinkle accent, darkened warm/green tints for pinned group and habit states).
- Fixed low-contrast checkboxes/habit circles — borders switched to the text color so they read clearly on dark.

#### Layout change and adjustments
- Tasks and Habits stacked in the left column, each capped at a max-height (400px, later Tasks lowered to 300px) and independently scrollable; Active Projects alone in the right column.
- Added a checkbox to each active project's current step (making it actionable like a task) plus an "on deck" preview of the next step.
- Header status chips changed to explicit counts: "X of Y completed" (tasks) and "X of Y logged" (habits).

### Architecture decisions

Key decisions that shape the codebase:

- **A single type-discriminated store** instead of separate tables per task type (see [Type hierarchy](#type-hierarchy)).
- **`completedAt` as a nullable date string, not a boolean** — so the exact completion date is always recoverable.
- **A single source of truth for display labels** (`DayNightLabel` in `src/types.ts`) so a label change is a one-line edit, not a find-and-replace.
- **End-to-end tests over unit tests**, because all meaningful behavior in this app only exists in a browser context (see [Testing](#testing)).

### Development workflow

Development happened over ~2 weeks across feature branches merged via pull request (`new-ui`, `new-log-strategy`), each a coherent unit of work reviewed before merging.

---

## What it does

### Task types

- **Tasks** — one-time items. Check them off to complete; completed tasks show crossed out until midnight, then drop off the list.
- **Repeat Tasks (habits)** — recurring items with a configurable reset schedule (daily or a specific weekday) and a **log mode**: *log today's date* (mark off as you go) or *log yesterday's date* (log the morning after). Once logged, a habit locks until its next reset cycle. Each log stores both the action date (when you clicked) and the recorded date (today or yesterday).
- **Multistep Projects** — projects made of ordered steps, each step a task in its own right. A progress bar tracks completion; steps can be reordered at creation. Active and deferred projects live in separate columns; a fully-completed project moves into its own Completed section and, like a plain task, ages out of view the day after completion.

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
- **Error banners** — a failed add, edit, delete, or log operation surfaces a dismissible banner instead of failing silently, so a rejected write is never mistaken for a successful one.

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | Preact 10 + TSX |
| Build | Vite 5 |
| Language | TypeScript 5 (strict) |
| Storage | IndexedDB (single type-discriminated store) |
| Tests | Playwright (end-to-end) |

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

Every test is a Playwright end-to-end test running against real Chromium. This is the correct layer for this app: every meaningful behavior — IndexedDB reads/writes, DOM interaction, derived state like streaks — only exists in a browser context, so there's no pure-logic layer worth isolating separately. **Each test gets a fresh browser context** (and therefore a fresh IndexedDB), so there's no shared state to reset between tests.

Coverage, by theme rather than by file (files get added, split, and renamed as the suite grows — the themes don't):

- **Core CRUD** — add, edit, delete, complete, and uncomplete across all four item types (tasks, requests, repeated habits, multistep projects).
- **Metadata & placement** — starred pinning, day/night domain badges, deferred visibility, and Home-tab surfacing rules.
- **Habits & streaks** — log-mode semantics (today vs. yesterday), streak math, and reset-cycle gating.
- **Multistep projects** — step completion, progress tracking, and the Completed section's next-day aging-out behavior.
- **Concurrency & conflict safety** — the snapshot-diff-merge pattern behind conflict-safe edits, including detecting and surfacing collisions from a concurrent edit in another tab.
- **Activity log** — the append-only event log: seeding from existing state on first upgrade, logging every completion/uncompletion/habit-log action, and surviving deletes and renames of the source item.
- **Error handling** — a failed operation surfaces a banner instead of silently no-op'ing.
- **Data-layer integrity** — a fresh database builds cleanly via `onupgradeneeded`, and exports are complete and correctly shaped.

The streak and log-mode tests are the most interesting: they verify the one-day **anchor shift** for `logMode: 'yesterday'` habits, where "logged yesterday" maps to "recorded two days ago" and must still count as an active streak. Logs are injected directly into IndexedDB via `page.evaluate()` rather than clicking the Log button repeatedly.

Run `npm test` for the current test count and pass/fail status — intentionally not duplicated here, since it changes with every test added.

---

## Running it

```bash
npm install
npm run dev        # dev server at localhost:5173
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm test           # run the Playwright end-to-end suite
npm run test:ui    # Playwright interactive UI
```

---

## Updates - July 12, 2026

- Removed `migrateDB`, the ad-hoc field-backfill routine that re-scanned and rewrote every record on **every page load**. Schema/data migration is now handled entirely by `DB_VERSION`-gated `onupgradeneeded`, which only runs once, when the version actually changes.
- Tightened `db.ts` type safety: `dbGetAll`'s implementation signature now takes `TaskType` instead of a bare `string`; the (now-removed) migration function used a `switch`/`never` exhaustiveness guard so adding a new `ItemType` later fails to compile until every handler accounts for it.
- Restored and hardened `tests/screenshots.ts` (the script used to generate marketing screenshots) after pulling it back from a stash:
  - It now goes through the shared `./fixtures` test-database isolation. Previously it bypassed that isolation entirely, opening the real production database name directly — the root cause of an earlier incident where a screenshot script wiped real IndexedDB data.
  - Dropped a hardcoded IndexedDB schema version that had drifted out of sync with the app's actual `DB_VERSION`.
  - Replaced loose `any[]` typing over fixture records with the app's real `AnyTask` union, so a future field rename in `src/types.ts` is caught by the compiler here too.
  - Added an assertion that the fixture titles used to demonstrate "completed today" styling actually exist in `sample-data.json` — a silent rename/typo now fails the test loudly instead of quietly producing a screenshot that no longer shows the feature it's meant to demonstrate.
  - Hardened date handling in `freshen()` (the function that shifts fixture dates forward so screenshots look current): a malformed or missing date across the *entire* dataset now fails with a clear message instead of silently comparing against a magic sentinel value, and a malformed date on any *individual* record or step — the kind of mistake a hand-edit to `sample-data.json` could introduce — is now caught and reported by name (record type, title, id, and field) before it can silently produce `NaN`-laced garbage dates downstream.
- `HomeTab` and `TasksTab` each loaded their data via 2–4 separate `dbGetAll` calls — one full IndexedDB `getAll()` scan per item type. Both now fetch once via `dbExportAll` and filter client-side by type, cutting redundant scans on every load/tab switch.
