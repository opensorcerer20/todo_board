import * as fs from 'fs';

import { expect, test, DB_TEST_NAME } from './fixtures';
import type { Page } from '@playwright/test';

import {
  addMultistepProject,
  addRepeatedTask,
  addRequest,
  addTask,
  goToTab,
} from './helpers';
import { ItemType } from '../src/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function captureDownloadJSON(page: Page, trigger: () => Promise<void>): Promise<unknown> {
  const [download] = await Promise.all([page.waitForEvent('download'), trigger()]);
  const path = await download.path();
  return JSON.parse(fs.readFileSync(path!, 'utf8'));
}

// ── Export JSON ───────────────────────────────────────────────────────────────

test('export JSON downloads a file containing all task records', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Export test task');

  const data = await captureDownloadJSON(page, () =>
    page.getByRole('button', { name: 'Export JSON' }).click()
  ) as { title: string; type: string }[];

  expect(Array.isArray(data)).toBe(true);
  expect(data.some(t => t.title === 'Export test task' && t.type === ItemType.TASK)).toBe(true);
});

test('export JSON filename includes today\'s date', async ({ page }) => {
  await page.goto('/');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON' }).click(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  expect(download.suggestedFilename()).toBe(`task-board-export-${today}.json`);
});

// ── Export Activity Log ───────────────────────────────────────────────────────

test('export activity log includes completed one-time task', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Finished task');
  await goToTab(page, 'Tasks');
  await page.locator('.task-card', { hasText: 'Finished task' }).locator('input[type="checkbox"]').click();

  const data = await captureDownloadJSON(page, () =>
    page.getByRole('button', { name: 'Export Activity Log' }).click()
  ) as { kind: string; title: string; completedAt: string }[];

  const entry = data.find(e => e.kind === ItemType.TASK && e.title === 'Finished task');
  expect(entry).toBeDefined();
  expect(entry!.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('export activity log includes completed request', async ({ page }) => {
  await page.goto('/');
  await addRequest(page, 'Finished request');
  await goToTab(page, 'Tasks');
  await page.locator('.task-card', { hasText: 'Finished request' }).locator('input[type="checkbox"]').click();

  const data = await captureDownloadJSON(page, () =>
    page.getByRole('button', { name: 'Export Activity Log' }).click()
  ) as { kind: string; title: string; completedAt: string }[];

  const entry = data.find(e => e.kind === ItemType.REQUEST && e.title === 'Finished request');
  expect(entry).toBeDefined();
  expect(entry!.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('export activity log includes completed multistep step', async ({ page }) => {
  await page.goto('/');
  await addMultistepProject(page, 'Build Feature', ['Write tests']);
  await goToTab(page, 'Multistep');
  await page.locator('.step-item', { hasText: 'Write tests' }).locator('input[type="checkbox"]').click();

  const data = await captureDownloadJSON(page, () =>
    page.getByRole('button', { name: 'Export Activity Log' }).click()
  ) as { kind: string; stepTitle: string; projectTitle: string; completedAt: string }[];

  const entry = data.find(e => e.kind === ItemType.STEP && e.stepTitle === 'Write tests');
  expect(entry).toBeDefined();
  expect(entry!.projectTitle).toBe('Build Feature');
  expect(entry!.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('export activity log includes logged habit with logMode today', async ({ page }) => {
  await page.goto('/');
  await addRepeatedTask(page, 'Morning run');
  await goToTab(page, 'Repeat Tasks');
  await page.locator('.task-card', { hasText: 'Morning run' }).getByText('Log ✓').click();

  const data = await captureDownloadJSON(page, () =>
    page.getByRole('button', { name: 'Export Activity Log' }).click()
  ) as { kind: string; title: string; logMode: string; recordedDate: string; actionDate: string }[];

  const entry = data.find(e => e.kind === ItemType.HABIT && e.title === 'Morning run');
  expect(entry).toBeDefined();
  expect(entry!.logMode).toBe('today');
  expect(entry!.recordedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(entry!.actionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test('export activity log includes logged habit with logMode yesterday', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Repeat Tasks');
  await page.getByPlaceholder('Habit or recurring task…').fill('Evening journal');
  await page.locator('.form-group', { hasText: 'Log date' }).locator('select').selectOption('yesterday');
  await page.getByRole('button', { name: 'Add' }).click();

  await page.locator('.task-card', { hasText: 'Evening journal' }).getByText('Log ✓').click();

  const data = await captureDownloadJSON(page, () =>
    page.getByRole('button', { name: 'Export Activity Log' }).click()
  ) as { kind: string; title: string; logMode: string; recordedDate: string; actionDate: string }[];

  const entry = data.find(e => e.kind === ItemType.HABIT && e.title === 'Evening journal');
  expect(entry).toBeDefined();
  expect(entry!.logMode).toBe('yesterday');
  // recordedDate should be yesterday, actionDate should be today
  expect(entry!.recordedDate).not.toBe(entry!.actionDate);
});

test('export activity log is sorted newest first', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Recent task');
  await addTask(page, 'Old task');

  // Complete both tasks via UI
  await goToTab(page, 'Tasks');
  await page.locator('.task-card', { hasText: 'Recent task' }).locator('input[type="checkbox"]').click();
  await page.locator('.task-card', { hasText: 'Old task' }).locator('input[type="checkbox"]').click();

  // Backdate the old task directly in IndexedDB
  await page.evaluate((db) => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(db);
    req.onsuccess = () => {
      const tx    = req.result.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      const all   = store.getAll();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      all.onsuccess = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const task = (all.result as any[]).find(t => t.title === 'Old task');
        if (!task) { reject(new Error('task not found')); return; }
        task.completedAt = '2020-01-01';
        store.put(task);
      };
      tx.oncomplete = () => resolve();
      tx.onerror   = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  }), DB_TEST_NAME);

  const data = await captureDownloadJSON(page, () =>
    page.getByRole('button', { name: 'Export Activity Log' }).click()
  ) as { kind: string; title: string }[];

  const recentIdx = data.findIndex(e => e.title === 'Recent task');
  const oldIdx    = data.findIndex(e => e.title === 'Old task');
  expect(recentIdx).toBeGreaterThanOrEqual(0);
  expect(oldIdx).toBeGreaterThanOrEqual(0);
  expect(recentIdx).toBeLessThan(oldIdx);
});

test('export activity log filename includes today\'s date', async ({ page }) => {
  await page.goto('/');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export Activity Log' }).click(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  expect(download.suggestedFilename()).toBe(`task-board-activity-${today}.json`);
});
