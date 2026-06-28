# Task Board

A personal task management app built with Preact, TypeScript, Vite, and IndexedDB. All data is stored locally in the browser — no backend required.

## Features

### Task types

**Tasks** are one-time items. Check them off to mark them complete. Completed tasks are shown crossed out until midnight, then disappear.

**Repeat Tasks** are habits or recurring items. Each has a configurable reset schedule (daily or a specific weekday) and a log mode:
- *Log today's date* — for tasks you mark off as you do them
- *Log yesterday's date* — for tasks you log the morning after (e.g. "I didn't have caffeine yesterday")

Once logged, the task locks until the next reset cycle. Each log is stored with both the action date (when you clicked Log) and the recorded date (today or yesterday).

**Multistep Tasks** are projects made up of ordered steps, where each step is itself a task with a title and completion date. Steps can be reordered in the creation form. A progress bar tracks how many steps are done. Active projects and deferred projects are shown in separate columns.

### Task metadata

Every task type supports a set of optional metadata fields:

| Field | Applies to | Description |
|---|---|---|
| **Starred** `★` | Tasks, Repeat Tasks, Multistep steps | Marks high-priority items. Starred tasks sort to the top of the Home tab tasks section and show in a dedicated pinned group. |
| **Work/Errand · Personal** | Tasks, Repeat Tasks, Multistep steps | Tags a task to a time-of-day domain. Shown as a `☀️ Work/Errand` or `🌙 Personal` badge on the task card. Defaults to Personal. |
| **Deferred** | Multistep projects | Moves the project to the Deferred column and hides it from the Home tab. Shown as a `⏸ Deferred` badge inline with the project title. |

### Home tab

The Home tab is a read-only daily dashboard with a domain toggle (Work/Errand · Personal) that filters everything on the page. It surfaces:

- **Tasks** — incomplete one-time tasks for the active domain, plus any completed today (shown crossed out). Starred tasks appear in a `★ Pinned · do first` group above the rest.
- **Habits** — all repeat tasks for the active domain, with a streak counter (`N day streak` / `N week streak`) below each habit name.
- **Active Projects** — all non-deferred multistep projects with a progress bar and the current step highlighted.

Starred items float to the top of the Tasks section. Deferred multistep projects are excluded from all Home tab panels regardless of domain.

### Data export

The header contains an **Export JSON** button that downloads all IndexedDB records as a dated JSON file (`task-board-export-YYYY-MM-DD.json`), suitable for backup or migration.

### Light / Dark mode

A toggle in the header switches between light mode (the standard tab UI) and dark mode (derived from the Home tab's palette). The preference is persisted in `localStorage`.

## Tech stack

| Layer | Choice |
|---|---|
| UI | Preact 10 + TSX |
| Build | Vite 5 |
| Types | TypeScript 5 (strict) |
| Storage | IndexedDB (single `tasks` store, type-discriminated) |
| Tests | Playwright |

## Type hierarchy

All task-like things share a `SimpleTask` base (`id`, `type`, `title`, `completedAt`, `createdAt`). Metadata fields are added at the level where they make sense:

```
SimpleTask
├── PlainTask          (type: 'task',      id: number,      + starred, dayNight)
├── MultistepTask      (type: 'task',      id: string UUID, + starred, dayNight, deferred) ← embedded steps only
├── RepeatedTask       (type: 'repeated',  id: number,      + starred, dayNight, logMode, logs)
└── MultiStepProject   (type: 'multistep', id: number,      + deferred, steps: MultistepTask[])
```

`MultiStepProject` has no `starred` or `dayNight` — those belong to its individual steps.

`completedAt` is `string | null` (YYYY-MM-DD) rather than a boolean so the exact completion date is always known.

`DayNightLabel` in `src/types.ts` is the single source of truth for the display labels (`☀️ Work/Errand` / `🌙 Personal`). All components import from there — changing a label is a one-line edit.

## Development

```bash
npm install
npm run dev        # start dev server at localhost:5173
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm test           # run Playwright tests (33 tests)
npm run test:ui    # Playwright interactive UI
```

## Testing strategy

All tests are Playwright end-to-end tests running against a real Chromium browser. This is the right layer for this app because all meaningful behaviour — IndexedDB reads/writes, DOM interaction, derived state — only exists in a browser context. There is no pure-logic layer worth isolating into unit tests separately.

**Each test gets a fresh browser context**, which means a fresh IndexedDB with no pre-existing data. There is no explicit setup or teardown to clear state between tests.

### Task CRUD tests (`tests/tasks.spec.ts`) — 4 tests

Focused tests for the Tasks tab: add a task, delete it, complete it, uncomplete it. These act as the functional unit tests for the core data path (form → IndexedDB → re-render).

### Edit modal tests (`tests/editing.spec.ts`) — 12 tests

Covers the edit modal for all three task types:

- **Tasks**: edit title, toggle star, change domain (Work/Errand ↔ Personal), cancel and escape both discard changes without saving.
- **Repeat Tasks**: edit title, change reset schedule (e.g. Daily → Monday), change domain.
- **Multistep projects**: edit project title, edit a step title, add a step, defer a project via the modal.

### Metadata tests (`tests/metadata.spec.ts`) — 10 tests

Covers starred, domain badge, and deferred features across task types:

- **Starred on Home tab**: a starred Work/Errand task appears in the `★ Pinned · do first` section; starred tasks appear before non-starred in that section; a starred multistep step also surfaces in the pinned group.
- **Domain badges**: `☀️ Work/Errand` and `🌙 Personal` badges render correctly on Tasks, Repeat Tasks, and Multistep step cards after creation.
- **Multistep step badge**: the `☀️` emoji badge on a step card reflects the domain selected at creation time.
- **Deferred**: a deferred multistep project (with a Work/Errand step, to rule out domain mismatch as the cause) is absent from all Home tab panels; a non-deferred project's name appears in the Active Projects card.

### Home tab display tests (`tests/home.spec.ts`) — 1 test

Regression test for the domain-step interaction: when a project has an incomplete Work/Errand step followed by an incomplete Personal step, switching to Personal mode must not surface the Personal step while the Work/Errand step is still pending. Only the current step (first incomplete overall) surfaces, and only when its domain matches the active view.

### Streak tests (`tests/streak.spec.ts`) — 6 tests

Covers the daily streak calculation for both log modes. Logs are injected directly into IndexedDB via `page.evaluate()` to avoid clicking the Log button repeatedly.

| Scenario | logMode: today | logMode: yesterday |
|---|---|---|
| Active streak | Last log is today → shows count | Last action is today (records yesterday) → shows count |
| Grace period | Last log is yesterday (not yet today) → streak still alive | Last action is yesterday (not yet today) → streak still alive |
| Broken streak | Last log is 2+ days ago → shows reset label (e.g. "Daily") | Last action is 2+ days ago → shows reset label |

The `logMode: 'yesterday'` tests verify the anchor shift: a task configured to log yesterday's date has a one-day offset applied to the streak window, so "logged yesterday" maps to "recorded two days ago" and still counts as an active streak.

## Todo
- [x] edit tasks
- [x] export button
- [ ] checkboxes on home tab
- [x] multistep: show deferred on right side minimized but still editable
