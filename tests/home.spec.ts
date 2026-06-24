import { test, expect } from '@playwright/test';
import { goToTab, addTask, addRepeatedTask, addMultistepProject } from './helpers';

// Fixed point in time used as "today" across all home tab tests.
const TODAY = new Date('2026-06-24T12:00:00');
const YESTERDAY = new Date('2026-06-23T12:00:00');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: TODAY });
  await page.goto('/');
});

test('incomplete tasks appear normally on Home', async ({ page }) => {
  await addTask(page, 'Normal task');
  await goToTab(page, 'Home');

  const title = page.locator('.task-title', { hasText: 'Normal task' });
  await expect(title).toBeVisible();
  await expect(title).not.toHaveClass(/completed/);
});

test('task completed today appears crossed out on Home', async ({ page }) => {
  await addTask(page, 'Done today');

  await goToTab(page, 'Tasks');
  await page.locator('.task-card', { hasText: 'Done today' })
    .locator('input[type="checkbox"]')
    .click();

  await goToTab(page, 'Home');

  const title = page.locator('.task-title', { hasText: 'Done today' });
  await expect(title).toBeVisible();
  await expect(title).toHaveClass(/completed/);
});

test('task completed yesterday is absent from Home', async ({ page }) => {
  // Start with the clock set to yesterday so completing the task records that date.
  await page.clock.setFixedTime(YESTERDAY);
  await page.reload();

  await addTask(page, 'Done yesterday');

  await goToTab(page, 'Tasks');
  await page.locator('.task-card', { hasText: 'Done yesterday' })
    .locator('input[type="checkbox"]')
    .click();

  // Advance to today and reload so the app re-evaluates the date.
  await page.clock.setFixedTime(TODAY);
  await page.reload();

  await goToTab(page, 'Home');

  await expect(page.locator('.task-title', { hasText: 'Done yesterday' })).not.toBeVisible();
});

test('all repeated tasks appear on Home', async ({ page }) => {
  await addRepeatedTask(page, 'Morning run');
  await addRepeatedTask(page, 'Evening stretch');

  await goToTab(page, 'Home');

  await expect(page.locator('.task-title', { hasText: 'Morning run' })).toBeVisible();
  await expect(page.locator('.task-title', { hasText: 'Evening stretch' })).toBeVisible();
});

test('only first unchecked step appears from a multistep project', async ({ page }) => {
  await addMultistepProject(page, 'My Project', ['Step Alpha', 'Step Beta']);

  await goToTab(page, 'Home');

  // Only the first unchecked step should be visible.
  await expect(page.locator('.task-title', { hasText: 'Step Alpha' })).toBeVisible();
  await expect(page.locator('.task-title', { hasText: 'Step Beta' })).not.toBeVisible();

  // Complete the first step in the Multistep tab.
  await goToTab(page, 'Multistep');
  await page.locator('.step-item', { hasText: 'Step Alpha' })
    .locator('input[type="checkbox"]')
    .click();

  // Home should now surface Step Beta as the next step.
  await goToTab(page, 'Home');
  await expect(page.locator('.task-title', { hasText: 'Step Beta' })).toBeVisible();
  await expect(page.locator('.task-title', { hasText: 'Step Alpha' })).not.toBeVisible();
});
