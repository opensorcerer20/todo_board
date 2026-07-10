import * as fs from 'fs';

import type { Page } from '@playwright/test';

import { ItemType } from '../src/types';
import {
  expect,
  test,
} from './fixtures';
import {
  addTask,
} from './helpers';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function captureDownloadJSON(page: Page, trigger: () => Promise<void>): Promise<unknown> {
  const [download] = await Promise.all([page.waitForEvent('download'), trigger()]);
  const path = await download.path();
  return JSON.parse(fs.readFileSync(path!, 'utf8'));
}

// ── Export JSON (full data snapshot) ──────────────────────────────────────────

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
// Content/shape of the activity log itself is covered in activity.spec.ts
// (reads the append-only `activity` store directly). This file only exercises
// the export button/download plumbing.

test('export activity log filename includes today\'s date', async ({ page }) => {
  await page.goto('/');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export Activity Log' }).click(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  expect(download.suggestedFilename()).toBe(`task-board-activity-${today}.json`);
});
