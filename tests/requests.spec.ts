import { test, expect } from '@playwright/test';
import { goToTab, addTask, addRequest } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// ── Tasks tab — basic CRUD ────────────────────────────────────────────────────

test('can add a request', async ({ page }) => {
  await addRequest(page, 'Ask for budget approval');
  await expect(page.locator('.task-card', { hasText: 'Ask for budget approval' })).toBeVisible();
});

test('request appears in Requests section, not To Do', async ({ page }) => {
  await addTask(page, 'A plain task');
  await addRequest(page, 'A request item');

  await goToTab(page, 'Tasks');

  const toDoSection = page.locator('.section-label', { hasText: 'To Do' });
  const requestsSection = page.locator('.section-label', { hasText: 'Requests' });

  await expect(toDoSection).toBeVisible();
  await expect(requestsSection).toBeVisible();

  // Plain task is under To Do, not under Requests
  const toDoCard = toDoSection.locator('~ .task-list').first().locator('.task-card', { hasText: 'A plain task' });
  await expect(toDoCard).toBeVisible();

  const requestsCard = requestsSection.locator('~ .task-list').first().locator('.task-card', { hasText: 'A request item' });
  await expect(requestsCard).toBeVisible();
});

test('requests section label counts only requests', async ({ page }) => {
  await addTask(page, 'Task one');
  await addRequest(page, 'Request one');
  await addRequest(page, 'Request two');

  await goToTab(page, 'Tasks');
  await expect(page.locator('.section-label', { hasText: 'To Do · 1' })).toBeVisible();
  await expect(page.locator('.section-label', { hasText: 'Requests · 2' })).toBeVisible();
});

test('can delete a request', async ({ page }) => {
  await addRequest(page, 'Temporary request');
  await expect(page.locator('.task-card', { hasText: 'Temporary request' })).toBeVisible();

  await page.locator('.task-card', { hasText: 'Temporary request' }).getByTitle('Delete').click();
  await page.getByRole('button', { name: 'Confirm' }).click();

  await expect(page.locator('.task-card', { hasText: 'Temporary request' })).not.toBeVisible();
});

test('can complete a request', async ({ page }) => {
  await addRequest(page, 'Request to complete');

  await page.locator('.task-card', { hasText: 'Request to complete' })
    .locator('input[type="checkbox"]')
    .click();

  await expect(
    page.locator('.task-card', { hasText: 'Request to complete' }).locator('.task-title')
  ).toHaveClass(/completed/);
});

test('can uncomplete a request', async ({ page }) => {
  await addRequest(page, 'Request to uncomplete');

  const checkbox = page.locator('.task-card', { hasText: 'Request to uncomplete' })
    .locator('input[type="checkbox"]');

  await checkbox.click();
  await expect(
    page.locator('.task-card', { hasText: 'Request to uncomplete' }).locator('.task-title')
  ).toHaveClass(/completed/);

  await checkbox.click();
  await expect(
    page.locator('.task-card', { hasText: 'Request to uncomplete' }).locator('.task-title')
  ).not.toHaveClass(/completed/);
});

test('completed request appears in Completed section', async ({ page }) => {
  await addRequest(page, 'Finished request');

  await page.locator('.task-card', { hasText: 'Finished request' })
    .locator('input[type="checkbox"]')
    .click();

  await expect(page.locator('.section-label', { hasText: 'Completed' })).toBeVisible();
  await expect(page.locator('.task-card', { hasText: 'Finished request' }).locator('.task-title')).toHaveClass(/completed/);

  // Should no longer appear in Requests section
  await expect(page.locator('.section-label', { hasText: 'Requests · ' })).not.toBeVisible();
});

// ── Tasks tab — edit modal ────────────────────────────────────────────────────

test('edit modal title says Edit Request for requests', async ({ page }) => {
  await addRequest(page, 'Some request');

  await page.locator('.task-card', { hasText: 'Some request' }).getByTitle('Edit').click();
  await expect(page.locator('.modal-title')).toHaveText('Edit Request');
});

test('can edit a request title', async ({ page }) => {
  await addRequest(page, 'Old request title');

  await page.locator('.task-card', { hasText: 'Old request title' }).getByTitle('Edit').click();
  await page.locator('.modal-card input[type="text"]').fill('New request title');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.task-card', { hasText: 'New request title' })).toBeVisible();
  await expect(page.locator('.task-card', { hasText: 'Old request title' })).not.toBeVisible();
});

test('task edit modal still says Edit Task', async ({ page }) => {
  await addTask(page, 'Some task');

  await goToTab(page, 'Tasks');
  await page.locator('.task-card', { hasText: 'Some task' }).getByTitle('Edit').click();
  await expect(page.locator('.modal-title')).toHaveText('Edit Task');
});

// ── Home tab — requests card ──────────────────────────────────────────────────

test('pending request appears on Home tab', async ({ page }) => {
  await addRequest(page, 'Home tab request');
  await goToTab(page, 'Home');

  await expect(page.getByText(/^Requests · \d/)).toBeVisible();
  await expect(page.getByText('Home tab request')).toBeVisible();
});

test('completed request does not appear in Home tab requests card', async ({ page }) => {
  await addRequest(page, 'Completed request');

  await page.locator('.task-card', { hasText: 'Completed request' })
    .locator('input[type="checkbox"]')
    .click();

  await goToTab(page, 'Home');
  await expect(page.getByText(/^Requests · \d/)).not.toBeVisible();
});

test('plain task does not appear in Home tab requests card', async ({ page }) => {
  await addTask(page, 'Just a task');
  await goToTab(page, 'Home');

  // No requests card should appear since there are no pending requests
  await expect(page.getByText(/^Requests · \d/)).not.toBeVisible();
});

test('multiple pending requests all appear on Home tab', async ({ page }) => {
  await addRequest(page, 'First request');
  await addRequest(page, 'Second request');
  await addRequest(page, 'Third request');

  await goToTab(page, 'Home');
  await expect(page.getByText('Requests · 3')).toBeVisible();
  await expect(page.getByText('First request')).toBeVisible();
  await expect(page.getByText('Second request')).toBeVisible();
  await expect(page.getByText('Third request')).toBeVisible();
});
