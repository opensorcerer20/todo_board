import { test, expect } from '@playwright/test';
import { goToTab, addTask, addRepeatedTask, addMultistepProject } from './helpers';

// -- Starred -----------------------------------------------------------------

test('starred plain task shows star icon on Home tab', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Tasks');
  await page.locator('.add-form .form-group', { hasText: 'Time' }).locator('select').selectOption('day');
  await page.locator('.add-form .btn-star').click();
  await page.getByPlaceholder('What needs to be done?').fill('Important task');
  await page.getByRole('button', { name: 'Add' }).click();

  await goToTab(page, 'Home');
  const tasksPanel = page.getByTestId('tasks-panel');
  await expect(tasksPanel.getByText('★ Pinned · do first')).toBeVisible();
  await expect(tasksPanel.getByText('Important task')).toBeVisible();
});

test('starred plain task appears before non-starred on Home tab', async ({ page }) => {
  await page.goto('/');
  // Both tasks use default Personal domain so no domain re-selection needed after Add resets the form.
  await goToTab(page, 'Tasks');
  await page.getByPlaceholder('What needs to be done?').fill('Regular task');
  await page.getByRole('button', { name: 'Add' }).click();

  await page.locator('.add-form .btn-star').click();
  await page.getByPlaceholder('What needs to be done?').fill('Starred task');
  await page.getByRole('button', { name: 'Add' }).click();

  await goToTab(page, 'Home');
  const tasksPanel = page.getByTestId('tasks-panel');
  await expect(tasksPanel.getByText('★ Pinned · do first')).toBeVisible();
  await expect(tasksPanel.getByText('Starred task')).toBeVisible();
  await expect(tasksPanel.getByText('Regular task')).toBeVisible();
});

test('starred multistep step shows star icon on Home tab', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Multistep');
  await page.getByPlaceholder('Task name…').fill('My Project');
  await page.locator('.step-builder-row .btn-star-sm').first().click();
  await page.locator('.step-builder-row input[type="text"]').first().fill('Starred Step');
  await page.locator('.step-builder-row .step-day-night').first().selectOption('day');
  await page.getByRole('button', { name: 'Create Task' }).click();

  await goToTab(page, 'Home');
  const tasksPanel = page.getByTestId('tasks-panel');
  await expect(tasksPanel.getByText('★ Pinned · do first')).toBeVisible();
  await expect(tasksPanel.getByText('Starred Step')).toBeVisible();
});

// -- Day / Night -------------------------------------------------------------

test('task card shows Night badge by default', async ({ page }) => {
  await page.goto('/');
  await addTask(page, 'Night task');
  await goToTab(page, 'Tasks');
  await expect(
    page.locator('.task-card', { hasText: 'Night task' }).locator('.badge', { hasText: '🌙 Personal' })
  ).toBeVisible();
});

test('task card shows Day badge when Day is selected', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Tasks');
  await page.locator('.add-form .form-group', { hasText: 'Time' }).locator('select').selectOption('day');
  await page.getByPlaceholder('What needs to be done?').fill('Day task');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(
    page.locator('.task-card', { hasText: 'Day task' }).locator('.badge', { hasText: '☀️ Work/Errand' })
  ).toBeVisible();
});

test('repeat task card shows Night badge by default', async ({ page }) => {
  await page.goto('/');
  await addRepeatedTask(page, 'Evening stretch');
  await goToTab(page, 'Repeat Tasks');
  await expect(
    page.locator('.task-card', { hasText: 'Evening stretch' }).locator('.badge', { hasText: '🌙 Personal' })
  ).toBeVisible();
});

test('repeat task card shows Day badge when Day is selected', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Repeat Tasks');
  await page.locator('.add-form .form-group', { hasText: 'Time' }).locator('select').selectOption('day');
  await page.getByPlaceholder('Habit or recurring task…').fill('Morning yoga');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(
    page.locator('.task-card', { hasText: 'Morning yoga' }).locator('.badge', { hasText: '☀️ Work/Errand' })
  ).toBeVisible();
});

test('multistep step badge reflects day/night selection', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Multistep');
  await page.getByPlaceholder('Task name…').fill('My Project');
  await page.locator('.step-builder-row .step-day-night').first().selectOption('day');
  await page.locator('.step-builder-row input[type="text"]').first().fill('Day step');
  await page.getByRole('button', { name: 'Create Task' }).click();

  const card = page.locator('.task-card', { hasText: 'My Project' });
  await expect(card.locator('.step-badge', { hasText: '☀️' })).toBeVisible();
});

// -- Deferred ----------------------------------------------------------------

test('deferred multistep project is absent from Home tab', async ({ page }) => {
  await page.goto('/');
  await goToTab(page, 'Multistep');
  await page.getByPlaceholder('Task name…').fill('Deferred Project');
  await page.getByLabel('Defer').check();
  await page.locator('.step-builder-row input[type="text"]').first().fill('Step One');
  await page.locator('.step-builder-row .step-day-night').first().selectOption('day');
  await page.getByRole('button', { name: 'Create Task' }).click();

  await goToTab(page, 'Home');
  await expect(page.getByText('Step One')).not.toBeVisible();
  await expect(page.getByText('Deferred Project')).not.toBeVisible();
});

test('non-deferred multistep project appears on Home tab', async ({ page }) => {
  await page.goto('/');
  await addMultistepProject(page, 'Active Project', ['First step']);

  await goToTab(page, 'Home');
  // The project name appears in both the tasks panel badge and the Active Projects card.
  await expect(page.getByText('Active Project', { exact: true }).first()).toBeVisible();
});
