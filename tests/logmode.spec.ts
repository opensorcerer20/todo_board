import { test, expect, DB_TEST_NAME } from './fixtures';
import type { Page } from '@playwright/test';
import { goToTab, addRepeatedTask } from './helpers';
import { ItemType } from '../src/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

type LogEntry = { actionDate: string; recordedDate: string };

async function injectLogs(page: Page, title: string, logs: LogEntry[]) {
  await page.evaluate(
    ({ title, logs, repeatedType, db }) => new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(db);
      req.onsuccess = () => {
        const tx = req.result.transaction('tasks', 'readwrite');
        const store = tx.objectStore('tasks');
        const all = store.getAll();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        all.onsuccess = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const task = (all.result as any[]).find(t => t.type === repeatedType && t.title === title);
          if (!task) { reject(new Error('task not found: ' + title)); return; }
          task.logs = logs;
          store.put(task);
        };
        tx.oncomplete = () => resolve();
        tx.onerror   = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    }),
    { title, logs, repeatedType: ItemType.REPEATED, db: DB_TEST_NAME }
  );
}

async function readTaskLogs(page: Page, title: string): Promise<LogEntry[]> {
  return page.evaluate(
    ({ title, repeatedType, db }) => new Promise<LogEntry[]>((resolve, reject) => {
      const req = indexedDB.open(db);
      req.onsuccess = () => {
        const tx = req.result.transaction('tasks', 'readonly');
        const all = tx.objectStore('tasks').getAll();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        all.onsuccess = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const task = (all.result as any[]).find(t => t.type === repeatedType && t.title === title);
          if (!task) { reject(new Error('task not found: ' + title)); return; }
          resolve(task.logs as LogEntry[]);
        };
        all.onerror = () => reject(all.error);
      };
      req.onerror = () => reject(req.error);
    }),
    { title, repeatedType: ItemType.REPEATED, db: DB_TEST_NAME }
  );
}

async function openEditModal(page: Page, taskTitle: string) {
  await page.locator('.task-card', { hasText: taskTitle }).locator('.btn-edit').click();
  await expect(page.locator('.modal-card')).toBeVisible();
}

async function changeLogModeInModal(page: Page, newMode: 'today' | 'yesterday') {
  await page.locator('.modal-card .form-group', { hasText: 'Log date' }).locator('select').selectOption(newMode);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Repeat Tasks');
});

test('today → yesterday: actionDate becomes recordedDate + 1 day', async ({ page }) => {
  const title = 'LogModeA';
  await addRepeatedTask(page, title);

  const recorded = daysAgo(2);
  await injectLogs(page, title, [{ actionDate: recorded, recordedDate: recorded }]);

  await page.reload();
  await goToTab(page, 'Repeat Tasks');
  await openEditModal(page, title);
  await changeLogModeInModal(page, 'yesterday');
  await page.locator('.modal-card').getByRole('button', { name: 'Save' }).click();

  const logs = await readTaskLogs(page, title);
  expect(logs).toHaveLength(1);
  expect(logs[0].recordedDate).toBe(recorded);
  expect(logs[0].actionDate).toBe(addDays(recorded, 1));
});

test('yesterday → today: actionDate becomes recordedDate', async ({ page }) => {
  const title = 'LogModeB';
  // Add as yesterday-mode task
  await page.getByPlaceholder('Habit or recurring task…').fill(title);
  await page.locator('.form-group', { hasText: 'Log date' }).locator('select').selectOption('yesterday');
  await page.getByRole('button', { name: 'Add' }).click();

  const recorded = daysAgo(3);
  await injectLogs(page, title, [{ actionDate: addDays(recorded, 1), recordedDate: recorded }]);

  await page.reload();
  await goToTab(page, 'Repeat Tasks');
  await openEditModal(page, title);
  await changeLogModeInModal(page, 'today');
  await page.locator('.modal-card').getByRole('button', { name: 'Save' }).click();

  const logs = await readTaskLogs(page, title);
  expect(logs).toHaveLength(1);
  expect(logs[0].recordedDate).toBe(recorded);
  expect(logs[0].actionDate).toBe(recorded);
});

test('logMode unchanged: logs are not modified', async ({ page }) => {
  const title = 'LogModeC';
  await addRepeatedTask(page, title);

  const originalLogs: LogEntry[] = [
    { actionDate: daysAgo(2), recordedDate: daysAgo(2) },
    { actionDate: daysAgo(1), recordedDate: daysAgo(1) },
  ];
  await injectLogs(page, title, originalLogs);

  await page.reload();
  await goToTab(page, 'Repeat Tasks');
  await openEditModal(page, title);
  // change only title, not logMode
  await page.locator('.modal-card input[type="text"]').fill('LogModeC-renamed');
  await page.locator('.modal-card').getByRole('button', { name: 'Save' }).click();

  const logs = await readTaskLogs(page, 'LogModeC-renamed');
  expect(logs).toHaveLength(2);
  expect(logs[0]).toEqual(originalLogs[0]);
  expect(logs[1]).toEqual(originalLogs[1]);
});

test('after today→yesterday: canLog blocks logging today if yesterday was already credited', async ({ page }) => {
  const title = 'LogModeD';
  await addRepeatedTask(page, title);

  // Inject a log crediting yesterday in today-mode: actionDate = yesterday, recordedDate = yesterday.
  // In yesterday-mode semantics, to credit yesterday you click today.
  // So after switching, actionDate should become today — blocking re-logging.
  const yesterday = daysAgo(1);
  await injectLogs(page, title, [{ actionDate: yesterday, recordedDate: yesterday }]);

  await page.reload();
  await goToTab(page, 'Repeat Tasks');
  await openEditModal(page, title);
  await changeLogModeInModal(page, 'yesterday');
  await page.locator('.modal-card').getByRole('button', { name: 'Save' }).click();

  // recalc: actionDate = yesterday + 1 = today → canLog sees lastAction === today → blocked
  await expect(
    page.locator('.task-card', { hasText: title }).getByRole('button', { name: 'Logged' })
  ).toBeVisible();
});

test('after yesterday→today: canLog opens if last action was yesterday', async ({ page }) => {
  const title = 'LogModeE';
  await page.getByPlaceholder('Habit or recurring task…').fill(title);
  await page.locator('.form-group', { hasText: 'Log date' }).locator('select').selectOption('yesterday');
  await page.getByRole('button', { name: 'Add' }).click();

  // Inject log: yesterday-mode, logged yesterday (action=yesterday, recorded=2 days ago)
  await injectLogs(page, title, [
    { actionDate: daysAgo(1), recordedDate: daysAgo(2) },
  ]);

  await page.reload();
  await goToTab(page, 'Repeat Tasks');

  // Switch to today-mode: actionDate recalculates to recordedDate (2 days ago)
  await openEditModal(page, title);
  await changeLogModeInModal(page, 'today');
  await page.locator('.modal-card').getByRole('button', { name: 'Save' }).click();

  // lastAction is now 2 days ago, today mode checks lastAction !== today → can log
  await expect(
    page.locator('.task-card', { hasText: title }).getByRole('button', { name: 'Log ✓' })
  ).toBeVisible();
});

test('changing logMode never mutates recordedDate', async ({ page }) => {
  const title = 'LogModeF';
  await addRepeatedTask(page, title);

  const originalRecorded = [daysAgo(4), daysAgo(3), daysAgo(2), daysAgo(1)];
  const originalLogs: LogEntry[] = originalRecorded.map(r => ({ actionDate: r, recordedDate: r }));
  await injectLogs(page, title, originalLogs);

  await page.reload();
  await goToTab(page, 'Repeat Tasks');
  await openEditModal(page, title);
  await changeLogModeInModal(page, 'yesterday');
  await page.locator('.modal-card').getByRole('button', { name: 'Save' }).click();

  const logs = await readTaskLogs(page, title);
  expect(logs).toHaveLength(4);
  for (let i = 0; i < 4; i++) {
    expect(logs[i].recordedDate).toBe(originalRecorded[i]);
  }
});
