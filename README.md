# Task Board

A personal task management app built with Preact, TypeScript, Vite, and IndexedDB. All data is stored locally in the browser — no backend required.

## Features

### Task types

**Tasks** are one-time items. Check them off to mark them complete. Completed tasks are shown crossed out until midnight, then disappear.

**Repeat Tasks** are habits or recurring items. Each has a configurable reset schedule (daily or a specific weekday) and a log mode:
- *Log today's date* — for tasks you mark off as you do them
- *Log yesterday's date* — for tasks you log the morning after (e.g. "I didn't have caffeine yesterday")

Once logged, the task locks until the next reset cycle. Each log is stored with both the action date (when you clicked Log) and the recorded date (today or yesterday).

**Multistep Tasks** are projects made up of ordered steps, where each step is itself a task with a title and completion date. Steps can be reordered in the creation form. A progress bar tracks how many steps are done.

### Task metadata

Every task type supports a set of optional metadata fields:

| Field | Applies to | Description |
|---|---|---|
| **Starred** `★` | Tasks, Repeat Tasks, Multistep steps | Marks high-priority items. Starred tasks sort to the top of every Home tab section and show a gold star icon. |
| **Day / Night** | Tasks, Repeat Tasks, Multistep steps | Tags a task as a daytime or nighttime item. Shown as a `☀️ Day` or `🌙 Night` badge on the task card. Defaults to Night. |
| **Deferred** | Multistep projects | Hides the entire project from the Home tab until un-deferred. Shown as a `⏸ Deferred` badge on the project card. |

### Home tab

The Home tab is a read-only daily dashboard that surfaces:
- All one-time tasks (incomplete, or completed today — crossed out)
- All repeat tasks with their current log status
- The **first unchecked step** from each multistep project (the next thing to do)

Tasks completed on a previous day are excluded entirely from the Home view. Deferred multistep projects are excluded regardless of completion state.

Starred items float to the top of each section and display a `★` icon.

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
├── RepeatedTask       (type: 'repeated',  id: number,      + starred, dayNight)
└── MultiStepProject   (type: 'multistep', id: number,      + deferred, steps: MultistepTask[])
```

`MultiStepProject` has no `starred` or `dayNight` — those belong to its individual steps.

`completedAt` is `string | null` (YYYY-MM-DD) rather than a boolean so the exact completion date is always known.

## Development

```bash
npm install
npm run dev        # start dev server at localhost:5173
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm test           # run Playwright tests
npm run test:ui    # Playwright interactive UI
```

## Testing strategy

All tests are Playwright end-to-end tests running against a real Chromium browser. This is the right layer for this app because all meaningful behaviour — IndexedDB reads/writes, DOM interaction, derived state — only exists in a browser context. There is no pure-logic layer worth isolating into unit tests separately.

**Each test gets a fresh browser context**, which means a fresh IndexedDB with no pre-existing data. There is no explicit setup or teardown to clear state between tests.

### Task CRUD tests (`tests/tasks.spec.ts`)

Focused tests for the Tasks tab: add a task, delete it, complete it, uncomplete it. These act as the functional unit tests for the core data path (form → IndexedDB → re-render).

### Metadata tests (`tests/metadata.spec.ts`)

Covers the starred, day/night, and deferred features across all three task types:

- **Starred**: star icon appears on the Home tab; starred items sort above non-starred in all three Home sections (tasks, repeat tasks, next steps).
- **Day/Night**: the correct `☀️ Day` or `🌙 Night` badge appears on task cards after creation; covers Tasks, Repeat Tasks, and Multistep step cards. Full emoji text is matched rather than bare words because Playwright's `hasText` is case-insensitive and `'Day'` would also match the `📅 Logs today` badge.
- **Deferred**: a deferred multistep project is absent from the Home tab; a non-deferred one is present.

### Home tab display tests (`tests/home.spec.ts`)

These verify the Home tab's filtering and display rules. Most are straightforward: add data in another tab, navigate to Home, assert what's visible.

**The tricky case — "task completed yesterday is absent"** — requires controlling what the app considers "today". The app derives the current date at runtime via `new Date()`, so a task completed yesterday will have `completedAt` set to yesterday's date string, and the Home tab should exclude it.

Playwright's `page.clock` API is used to control the browser's clock:

```ts
// 1. Start with the clock set to yesterday
await page.clock.install({ time: new Date('2026-06-23T12:00:00') });
await page.reload();

// 2. Add and complete the task — completedAt is recorded as '2026-06-23'
await addTask(page, 'Done yesterday');
await page.locator('.task-card', { hasText: 'Done yesterday' })
  .locator('input[type="checkbox"]').click();

// 3. Advance the clock to today and reload so the app re-evaluates the date
await page.clock.setFixedTime(new Date('2026-06-24T12:00:00'));
await page.reload();

// 4. The Home tab should now exclude the task
await goToTab(page, 'Home');
await expect(page.locator('.task-title', { hasText: 'Done yesterday' })).not.toBeVisible();
```

The reload after advancing the clock is necessary because the app reads `new Date()` during component render, not reactively. Without it, the cached in-memory state would still reflect yesterday's date evaluation.

## Todo
- edit tasks
- export button
- checkboxes on home tab
