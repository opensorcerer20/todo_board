import { test, expect } from '@playwright/test';
import { goToTab } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Tasks');
});

test('can add a task', async ({ page }) => {
  await page.getByPlaceholder('What needs to be done?').fill('Buy groceries');
  await page.getByRole('button', { name: 'Add' }).click();

  await expect(page.locator('.task-card', { hasText: 'Buy groceries' })).toBeVisible();
});

test('can delete a task', async ({ page }) => {
  await page.getByPlaceholder('What needs to be done?').fill('Temporary task');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.locator('.task-card', { hasText: 'Temporary task' })).toBeVisible();

  await page.locator('.task-card', { hasText: 'Temporary task' }).getByTitle('Delete').click();

  await expect(page.locator('.task-card', { hasText: 'Temporary task' })).not.toBeVisible();
});

test('can complete a task', async ({ page }) => {
  await page.getByPlaceholder('What needs to be done?').fill('Write tests');
  await page.getByRole('button', { name: 'Add' }).click();

  await page.locator('.task-card', { hasText: 'Write tests' })
    .locator('input[type="checkbox"]')
    .click();

  await expect(
    page.locator('.task-card', { hasText: 'Write tests' }).locator('.task-title')
  ).toHaveClass(/completed/);
});

test('can uncomplete a task', async ({ page }) => {
  await page.getByPlaceholder('What needs to be done?').fill('Read a book');
  await page.getByRole('button', { name: 'Add' }).click();

  const checkbox = page.locator('.task-card', { hasText: 'Read a book' })
    .locator('input[type="checkbox"]');

  await checkbox.click();
  await expect(
    page.locator('.task-card', { hasText: 'Read a book' }).locator('.task-title')
  ).toHaveClass(/completed/);

  await checkbox.click();
  await expect(
    page.locator('.task-card', { hasText: 'Read a book' }).locator('.task-title')
  ).not.toHaveClass(/completed/);
});
