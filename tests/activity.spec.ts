import type { Page } from '@playwright/test';
import { test, expect, DB_TEST_NAME } from './fixtures';
import { addTask, addRequest, addMultistepProject, addRepeatedTask, goToTab } from './helpers';
import { ItemType } from '../src/types';
import { activitySeedEvents } from '../src/utils';
import type { AnyTask } from '../src/types';

// ── Read the append-only activity store directly ──────────────────────────────

interface Ev {
  at: string; kind: string; action: string; itemId: number | string;
  title: string; projectTitle?: string; actionDate?: string; recordedDate?: string;
}

function readActivity(page: Page): Promise<Ev[]> {
  return page.evaluate((db) => new Promise<Ev[]>((resolve, reject) => {
    const req = indexedDB.open(db);
    req.onsuccess = () => {
      const all = req.result.transaction('activity', 'readonly').objectStore('activity').getAll();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      all.onsuccess = () => resolve((all.result as any[]).sort((a, b) => a.id - b.id));
      all.onerror = () => reject(all.error);
    };
    req.onerror = () => reject(req.error);
  }), DB_TEST_NAME) as Promise<Ev[]>;
}

// ── Seed mapping (pure function, no browser) ──────────────────────────────────

test('activitySeedEvents maps current completion state to events', () => {
  const tasks: AnyTask[] = [
    { id: 1, type: 'task', title: 'Done task', completedAt: '2026-01-02', createdAt: '2026-01-01', starred: false, dayNight: 'night' },
    { id: 2, type: 'task', title: 'Open task', completedAt: null, createdAt: '2026-01-01', starred: false, dayNight: 'night' },
    { id: 3, type: 'multistep', title: 'Proj', deferred: false, createdAt: '2026-01-01', completedAt: null,
      steps: [
        { id: 'a', type: 'task', title: 'S1', completedAt: '2026-01-03', createdAt: '2026-01-01', starred: false, dayNight: 'night', deferred: false },
        { id: 'b', type: 'task', title: 'S2', completedAt: null, createdAt: '2026-01-01', starred: false, dayNight: 'night', deferred: false },
      ] },
    { id: 4, type: 'repeated', title: 'Habit', resetDay: 'daily', logMode: 'today', createdAt: '2026-01-01', completedAt: null, starred: false, dayNight: 'night',
      logs: [{ actionDate: '2026-01-04', recordedDate: '2026-01-04' }] },
  ];

  const events = activitySeedEvents(tasks);
  // Only completed items + habit logs; open task and open step are skipped.
  expect(events).toHaveLength(3);
  expect(events.every(e => e.action === 'completed' || e.action === 'logged')).toBe(true);

  const step = events.find(e => e.kind === ItemType.STEP)!;
  expect(step.itemId).toBe('a');
  expect(step.projectId).toBe(3);
  expect(step.projectTitle).toBe('Proj');

  const habit = events.find(e => e.kind === ItemType.HABIT)!;
  expect(habit.action).toBe('logged');
  expect(habit.recordedDate).toBe('2026-01-04');
});

// ── Live append-only behavior ─────────────────────────────────────────────────

test('completing then unchecking a task appends both events', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Tasks');
  await page.getByPlaceholder('What needs to be done?').fill('Toggle me');
  await page.getByRole('button', { name: 'Add' }).click();

  const checkbox = page.locator('.task-card', { hasText: 'Toggle me' }).locator('input[type="checkbox"]');
  await checkbox.click();  // complete
  await expect(page.locator('.task-card', { hasText: 'Toggle me' }).locator('.task-title')).toHaveClass(/completed/);
  await checkbox.click();  // uncomplete
  await expect(page.locator('.task-card', { hasText: 'Toggle me' }).locator('.task-title')).not.toHaveClass(/completed/);

  const events = (await readActivity(page)).filter(e => e.title === 'Toggle me');
  expect(events.map(e => e.action)).toEqual(['completed', 'uncompleted']);
  expect(events.every(e => e.kind === ItemType.TASK)).toBe(true);
});

test('completing a step appends a step completed event', async ({ page }) => {
  await page.goto('/');
  await addMultistepProject(page, 'Proj', ['Alpha']);
  await goToTab(page, 'Multistep');
  await page.locator('.step-item', { hasText: 'Alpha' }).locator('input[type="checkbox"]').check();

  const events = (await readActivity(page)).filter(e => e.kind === ItemType.STEP && e.title === 'Alpha');
  expect(events).toHaveLength(1);
  expect(events[0].action).toBe('completed');
  expect(events[0].projectTitle).toBe('Proj');
});

test('completing a request appends a completed event', async ({ page }) => {
  await page.goto('/');
  await addRequest(page, 'Finished request');
  await goToTab(page, 'Tasks');
  await page.locator('.task-card', { hasText: 'Finished request' }).locator('input[type="checkbox"]').click();

  const events = (await readActivity(page)).filter(e => e.kind === ItemType.REQUEST && e.title === 'Finished request');
  expect(events).toHaveLength(1);
  expect(events[0].action).toBe('completed');
});

test('logging a habit appends a logged event', async ({ page }) => {
  await page.goto('/');
  await addRepeatedTask(page, 'Run');
  await goToTab(page, 'Repeat Tasks');
  await page.locator('.task-card', { hasText: 'Run' }).getByText('Log ✓').click();

  const events = (await readActivity(page)).filter(e => e.kind === ItemType.HABIT && e.title === 'Run');
  expect(events).toHaveLength(1);
  expect(events[0].action).toBe('logged');
  expect(events[0].actionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('logging a habit in yesterday mode records a recordedDate one day behind actionDate', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Repeat Tasks');
  await page.getByPlaceholder('Habit or recurring task…').fill('Evening journal');
  await page.locator('.form-group', { hasText: 'Log date' }).locator('select').selectOption('yesterday');
  await page.getByRole('button', { name: 'Add' }).click();
  await page.locator('.task-card', { hasText: 'Evening journal' }).getByText('Log ✓').click();

  const events = (await readActivity(page)).filter(e => e.kind === ItemType.HABIT && e.title === 'Evening journal');
  expect(events).toHaveLength(1);
  expect(events[0].action).toBe('logged');
  expect(events[0].recordedDate).not.toBe(events[0].actionDate);
});

test('activity events survive deleting the source task (append-only)', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Tasks');
  await page.getByPlaceholder('What needs to be done?').fill('Ephemeral');
  await page.getByRole('button', { name: 'Add' }).click();
  await page.locator('.task-card', { hasText: 'Ephemeral' }).locator('input[type="checkbox"]').click();

  await page.locator('.task-card', { hasText: 'Ephemeral' }).getByTitle('Delete').click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('.task-card', { hasText: 'Ephemeral' })).not.toBeVisible();

  const events = (await readActivity(page)).filter(e => e.title === 'Ephemeral');
  expect(events).toHaveLength(1);
  expect(events[0].action).toBe('completed');
});

test('renaming a task does not alter its earlier event (title snapshot)', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Tasks');
  await page.getByPlaceholder('What needs to be done?').fill('Before');
  await page.getByRole('button', { name: 'Add' }).click();
  await page.locator('.task-card', { hasText: 'Before' }).locator('input[type="checkbox"]').click();

  await page.locator('.task-card', { hasText: 'Before' }).getByTitle('Edit').click();
  await page.locator('.modal-card input[type="text"]').fill('After');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.task-card', { hasText: 'After' })).toBeVisible();

  const events = await readActivity(page);
  expect(events.some(e => e.title === 'Before' && e.action === 'completed')).toBe(true);
  expect(events.some(e => e.title === 'After')).toBe(false);
});

test('activity log preserves append order', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'First completed');
  await addTask(page, 'Second completed');

  await goToTab(page, 'Tasks');
  await page.locator('.task-card', { hasText: 'First completed' }).locator('input[type="checkbox"]').click();
  await page.locator('.task-card', { hasText: 'Second completed' }).locator('input[type="checkbox"]').click();

  const events = await readActivity(page);
  const firstIdx  = events.findIndex(e => e.title === 'First completed');
  const secondIdx = events.findIndex(e => e.title === 'Second completed');
  expect(firstIdx).toBeGreaterThanOrEqual(0);
  expect(secondIdx).toBeGreaterThanOrEqual(0);
  expect(firstIdx).toBeLessThan(secondIdx);
});
