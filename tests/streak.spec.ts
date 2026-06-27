import { test, expect, type Locator, type Page } from '@playwright/test';
import { goToTab } from './helpers';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Use local date arithmetic to match what the app computes as "today".
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

// Add a daily repeated task in Day mode (so it shows in the home tab's default Day view).
async function addDailyHabit(page: Page, title: string, logMode: 'today' | 'yesterday' = 'today') {
  await goToTab(page, 'Repeat Tasks');
  await page.getByPlaceholder('Habit or recurring task…').fill(title);
  await page.locator('.form-group', { hasText: 'Time' }).locator('select').selectOption('day');
  if (logMode === 'yesterday') {
    await page.locator('.form-group', { hasText: 'Log date' }).locator('select').selectOption('yesterday');
  }
  await page.getByRole('button', { name: 'Add' }).click();
}

// Write log entries directly into IndexedDB, bypassing the UI.
// After this, navigating to the Home tab will pick up the injected data
// because HomeTab re-mounts and re-reads the DB on every tab switch.
async function injectLogs(
  page: Page,
  title: string,
  logs: { actionDate: string; recordedDate: string }[]
) {
  await page.evaluate(
    ({ title, logs }) => new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('task_board_v2', 1);
      req.onsuccess = () => {
        const tx = req.result.transaction('tasks', 'readwrite');
        const store = tx.objectStore('tasks');
        const all = store.getAll();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        all.onsuccess = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const task = (all.result as any[]).find(t => t.type === 'repeated' && t.title === title);
          if (!task) { reject(new Error('task not found: ' + title)); return; }
          task.logs = logs;
          store.put(task);
        };
        tx.oncomplete = () => resolve();
        tx.onerror   = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    }),
    { title, logs }
  );
}

// Returns a locator for the streak label of a specific habit in the habits panel.
// Structure: <title div> and <streak div> are siblings inside a text-container div.
// We go: title element → parent (text container) → second child div (streak label).
function streakLabelOf(habitsPanel: Locator, habitTitle: string): Locator {
  return habitsPanel
    .getByText(habitTitle, { exact: true })
    .locator('..')          // text container (parent of title + streak divs)
    .locator('div')         // both title and streak divs, in document order
    .nth(1);                // nth(1) = streak label (nth(0) = title)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// ── logMode: 'today' ──────────────────────────────────────────────────────────
//
// Each log records on the same date the user clicks (actionDate = recordedDate).
// Streak is alive if the most recent recordedDate is today OR yesterday.
// Broken if most recent is 2+ days ago.

test('today-mode: shows streak count when logged consecutively up to today', async ({ page }) => {
  const title = 'TodayA';
  await addDailyHabit(page, title);
  await injectLogs(page, title, [
    { actionDate: daysAgo(0), recordedDate: daysAgo(0) },
    { actionDate: daysAgo(1), recordedDate: daysAgo(1) },
    { actionDate: daysAgo(2), recordedDate: daysAgo(2) },
  ]);
  await goToTab(page, 'Home');
  await expect(streakLabelOf(page.getByTestId('habits-panel'), title)).toHaveText('3 day streak');
});

test('today-mode: streak still active when not yet logged today but logged yesterday', async ({ page }) => {
  const title = 'TodayB';
  await addDailyHabit(page, title);
  await injectLogs(page, title, [
    { actionDate: daysAgo(1), recordedDate: daysAgo(1) },
    { actionDate: daysAgo(2), recordedDate: daysAgo(2) },
  ]);
  await goToTab(page, 'Home');
  await expect(streakLabelOf(page.getByTestId('habits-panel'), title)).toHaveText('2 day streak');
});

test('today-mode: streak broken when last log was 2 or more days ago', async ({ page }) => {
  const title = 'TodayC';
  await addDailyHabit(page, title);
  await injectLogs(page, title, [
    { actionDate: daysAgo(2), recordedDate: daysAgo(2) },
    { actionDate: daysAgo(3), recordedDate: daysAgo(3) },
  ]);
  await goToTab(page, 'Home');
  await expect(streakLabelOf(page.getByTestId('habits-panel'), title)).toHaveText('Daily');
});

// ── logMode: 'yesterday' ──────────────────────────────────────────────────────
//
// Each log records the day BEFORE the action (actionDate = recordedDate + 1 day).
// Streak is alive if the most recent recordedDate is yesterday OR 2 days ago
//   (covering: logged today → recorded yesterday; logged yesterday → recorded 2 days ago).
// Broken if most recent recordedDate is 3+ days ago (last action was 2+ days ago).

test('yesterday-mode: shows streak count when logged consecutively', async ({ page }) => {
  const title = 'YestA';
  await addDailyHabit(page, title, 'yesterday');
  await injectLogs(page, title, [
    { actionDate: daysAgo(0), recordedDate: daysAgo(1) }, // today's action → records yesterday
    { actionDate: daysAgo(1), recordedDate: daysAgo(2) },
    { actionDate: daysAgo(2), recordedDate: daysAgo(3) },
  ]);
  await goToTab(page, 'Home');
  await expect(streakLabelOf(page.getByTestId('habits-panel'), title)).toHaveText('3 day streak');
});

test('yesterday-mode: streak still active when last action was yesterday (not today yet)', async ({ page }) => {
  const title = 'YestB';
  await addDailyHabit(page, title, 'yesterday');
  await injectLogs(page, title, [
    { actionDate: daysAgo(1), recordedDate: daysAgo(2) }, // yesterday's action → recorded 2 days ago
    { actionDate: daysAgo(2), recordedDate: daysAgo(3) },
  ]);
  await goToTab(page, 'Home');
  await expect(streakLabelOf(page.getByTestId('habits-panel'), title)).toHaveText('2 day streak');
});

test('yesterday-mode: streak broken when last action was 2 or more days ago', async ({ page }) => {
  const title = 'YestC';
  await addDailyHabit(page, title, 'yesterday');
  await injectLogs(page, title, [
    { actionDate: daysAgo(2), recordedDate: daysAgo(3) }, // 2 days ago → recorded 3 days ago
    { actionDate: daysAgo(3), recordedDate: daysAgo(4) },
  ]);
  await goToTab(page, 'Home');
  await expect(streakLabelOf(page.getByTestId('habits-panel'), title)).toHaveText('Daily');
});
