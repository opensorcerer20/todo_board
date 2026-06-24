import { test, expect } from '@playwright/test';
import { goToTab, addTask, addRepeatedTask, addMultistepProject } from './helpers';

// -- Starred -----------------------------------------------------------------

test('starred plain task shows star icon on Home tab', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Tasks');
  await page.locator('.add-form .btn-star').click();
  await page.getByPlaceholder('What needs to be done?').fill('Important task');
  await page.getByRole('button', { name: 'Add' }).click();

  await goToTab(page, 'Home');
  await expect(
    page.locator('.task-card', { hasText: 'Important task' }).locator('.task-star')
  ).toBeVisible();
});

test('starred plain task appears before non-starred on Home tab', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Regular task');

  await goToTab(page, 'Tasks');
  await page.locator('.add-form .btn-star').click();
  await page.getByPlaceholder('What needs to be done?').fill('Starred task');
  await page.getByRole('button', { name: 'Add' }).click();

  await goToTab(page, 'Home');
  await expect(page.locator('.task-card').first()).toContainText('Starred task');
});

test('starred repeat task shows star icon on Home tab', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Repeat Tasks');
  await page.locator('.add-form .btn-star').click();
  await page.getByPlaceholder('Habit or recurring task').fill('Morning run');
  await page.getByRole('button', { name: 'Add' }).click();

  await goToTab(page, 'Home');
  await expect(
    page.locator('.task-card', { hasText: 'Morning run' }).locator('.task-star')
  ).toBeVisible();
});

test('starred multistep step shows star icon on Home tab', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Multistep');
  await page.getByPlaceholder('Task name').fill('My Project');
  await page.locator('.step-builder-row .btn-star-sm').first().click();
  await page.locator('.step-builder-row input').first().fill('Starred Step');
  await page.getByRole('button', { name: 'Create Task' }).click();

  await goToTab(page, 'Home');
  await expect(
    page.locator('.task-card', { hasText: 'Starred Step' }).locator('.task-star')
  ).toBeVisible();
});

// -- Day / Night -------------------------------------------------------------

test('task card shows Night badge by default', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Night task');
  await goToTab(page, 'Tasks');
  await expect(
    page.locator('.task-card', { hasText: 'Night task' }).locator('.badge', { hasText: '🌙 Night' })
  ).toBeVisible();
});

test('task card shows Day badge when Day is selected', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Tasks');
  await page.locator('.add-form .form-group', { hasText: 'Time' }).locator('select').selectOption('day');
  await page.getByPlaceholder('What needs to be done?').fill('Day task');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(
    page.locator('.task-card', { hasText: 'Day task' }).locator('.badge', { hasText: '☀️ Day' })
  ).toBeVisible();
});

test('repeat task card shows Night badge by default', async ({ page }) => {
  await page.goto('/');
  await addRepeatedTask(page, 'Evening stretch');
  await goToTab(page, 'Repeat Tasks');
  await expect(
    page.locator('.task-card', { hasText: 'Evening stretch' }).locator('.badge', { hasText: '🌙 Night' })
  ).toBeVisible();
});

test('repeat task card shows Day badge when Day is selected', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Repeat Tasks');
  await page.locator('.add-form .form-group', { hasText: 'Time' }).locator('select').selectOption('day');
  await page.getByPlaceholder('Habit or recurring task').fill('Morning yoga');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(
    page.locator('.task-card', { hasText: 'Morning yoga' }).locator('.badge', { hasText: '☀️ Day' })
  ).toBeVisible();
});

test('multistep step badge reflects day/night selection', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Multistep');
  await page.getByPlaceholder('Task name').fill('My Project');
  await page.locator('.step-builder-row .step-day-night').first().selectOption('day');
  await page.locator('.step-builder-row input').first().fill('Day step');
  await page.getByRole('button', { name: 'Create Task' }).click();

  const card = page.locator('.task-card', { hasText: 'My Project' });
  await expect(card.locator('.step-badge', { hasText: '☀️' })).toBeVisible();
});

// -- Deferred ----------------------------------------------------------------

test('deferred multistep project is absent from Home tab', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Multistep');
  await page.getByPlaceholder('Task name').fill('Deferred Project');
  await page.getByLabel('Defer').check();
  await page.locator('.step-builder-row input').first().fill('Step One');
  await page.getByRole('button', { name: 'Create Task' }).click();

  await goToTab(page, 'Home');
  await expect(page.locator('.task-title', { hasText: 'Step One' })).not.toBeVisible();
});

test('non-deferred multistep project appears on Home tab', async ({ page }) => {
  await page.goto('/');
  await addMultistepProject(page, 'Active Project', ['First step']);

  await goToTab(page, 'Home');
  await expect(page.locator('.task-title', { hasText: 'First step' })).toBeVisible();
});
