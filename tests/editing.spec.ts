import {
  expect,
  test,
} from './fixtures';
import {
  addMultistepProject,
  addRepeatedTask,
  addTask,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// ── Tasks tab ─────────────────────────────────────────────────────────────────

test('can edit a task title', async ({ page }) => {
  await addTask(page, 'Original title');
  await page.locator('.task-card', { hasText: 'Original title' }).getByTitle('Edit').click();

  await page.locator('.modal-card input[type="text"]').fill('Updated title');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.task-card', { hasText: 'Updated title' })).toBeVisible();
  await expect(page.locator('.task-card', { hasText: 'Original title' })).not.toBeVisible();
});

test('can star a task via edit modal', async ({ page }) => {
  await addTask(page, 'Unstarred task');
  const card = page.locator('.task-card', { hasText: 'Unstarred task' });
  await expect(card.locator('.badge-amber')).not.toBeVisible();

  await card.getByTitle('Edit').click();
  await page.locator('.modal-card .btn-star').click();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(card.locator('.badge-amber')).toBeVisible();
});

test('can change task day/night via edit modal', async ({ page }) => {
  await addTask(page, 'Night task');
  const card = page.locator('.task-card', { hasText: 'Night task' });
  await expect(card.locator('.badge', { hasText: '🌙 Personal' })).toBeVisible();

  await card.getByTitle('Edit').click();
  await page.locator('.modal-card .form-group', { hasText: 'Time' }).locator('select').selectOption('day');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(card.locator('.badge', { hasText: '☀️ Work/Errand' })).toBeVisible();
});

test('cancel closes task edit modal without saving', async ({ page }) => {
  await addTask(page, 'Do not change me');
  await page.locator('.task-card', { hasText: 'Do not change me' }).getByTitle('Edit').click();

  await page.locator('.modal-card input[type="text"]').fill('Changed title');
  await page.getByRole('button', { name: 'Cancel' }).click();

  await expect(page.locator('.modal-card')).not.toBeVisible();
  await expect(page.locator('.task-card', { hasText: 'Do not change me' })).toBeVisible();
});

test('escape closes task edit modal without saving', async ({ page }) => {
  await addTask(page, 'Escape test task');
  await page.locator('.task-card', { hasText: 'Escape test task' }).getByTitle('Edit').click();
  await expect(page.locator('.modal-card')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('.modal-card')).not.toBeVisible();
});

// ── Repeat tasks tab ──────────────────────────────────────────────────────────

test('can edit a repeat task title', async ({ page }) => {
  await addRepeatedTask(page, 'Old habit');
  await page.locator('.task-card', { hasText: 'Old habit' }).getByTitle('Edit').click();

  await page.locator('.modal-card input[type="text"]').fill('New habit');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.task-card', { hasText: 'New habit' })).toBeVisible();
  await expect(page.locator('.task-card', { hasText: 'Old habit' })).not.toBeVisible();
});

test('can change repeat task reset day via edit modal', async ({ page }) => {
  await addRepeatedTask(page, 'Weekly habit');
  const card = page.locator('.task-card', { hasText: 'Weekly habit' });
  await expect(card.locator('.badge-purple')).toContainText('Daily');

  await card.getByTitle('Edit').click();
  await page.locator('.modal-card .form-group', { hasText: 'Resets' }).locator('select').selectOption('1');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(card.locator('.badge-purple')).toContainText('Monday');
});

test('can change repeat task day/night via edit modal', async ({ page }) => {
  await addRepeatedTask(page, 'Morning habit');
  const card = page.locator('.task-card', { hasText: 'Morning habit' });
  await expect(card.locator('.badge', { hasText: '🌙 Personal' })).toBeVisible();

  await card.getByTitle('Edit').click();
  await page.locator('.modal-card .form-group', { hasText: 'Time' }).locator('select').selectOption('day');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(card.locator('.badge', { hasText: '☀️ Work/Errand' })).toBeVisible();
});

// ── Multistep tab ─────────────────────────────────────────────────────────────

test('can edit a multistep project title', async ({ page }) => {
  await addMultistepProject(page, 'Old Project', ['Step one']);
  await page.locator('.task-card', { hasText: 'Old Project' }).getByTitle('Edit').click();

  await page.locator('.modal-card input[type="text"]').first().fill('New Project');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.task-card', { hasText: 'New Project' })).toBeVisible();
  await expect(page.locator('.task-card', { hasText: 'Old Project' })).not.toBeVisible();
});

test('can edit a step title via multistep edit modal', async ({ page }) => {
  await addMultistepProject(page, 'My Project', ['Old step']);
  await page.locator('.task-card', { hasText: 'My Project' }).getByTitle('Edit').click();

  await page.locator('.modal-card .step-builder-row input').first().fill('New step');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(
    page.locator('.task-card', { hasText: 'My Project' }).locator('.step-item-title', { hasText: 'New step' })
  ).toBeVisible();
});

test('can add a step via multistep edit modal', async ({ page }) => {
  await addMultistepProject(page, 'Growing Project', ['Step one']);
  await page.locator('.task-card', { hasText: 'Growing Project' }).getByTitle('Edit').click();

  await page.locator('.modal-card .btn-add-step').click();
  await page.locator('.modal-card .step-builder-row input').nth(1).fill('Step two');
  await page.getByRole('button', { name: 'Save' }).click();

  const card = page.locator('.task-card', { hasText: 'Growing Project' });
  await expect(card.locator('.step-item-title', { hasText: 'Step two' })).toBeVisible();
  await expect(card.locator('.badge', { hasText: '0/2' })).toBeVisible();
});

test('blanking a step title blocks save (no silent delete)', async ({ page }) => {
  await addMultistepProject(page, 'Guard Project', ['Alpha', 'Beta']);
  await page.locator('.task-card', { hasText: 'Guard Project' }).getByTitle('Edit').click();

  // Clear the second step's title.
  await page.locator('.modal-card .step-builder-row input').nth(1).fill('');

  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  await expect(page.getByText('Every step needs a title', { exact: false })).toBeVisible();
});

test('editing a project preserves a completed step', async ({ page }) => {
  await addMultistepProject(page, 'History Project', ['Alpha', 'Beta']);
  const card = page.locator('.task-card', { hasText: 'History Project' });

  // Complete the Beta step from the list.
  await card.locator('.step-item', { hasText: 'Beta' }).locator('input[type="checkbox"]').check();
  await expect(card.locator('.step-item', { hasText: 'Beta' })).toHaveClass(/step-done/);
  await expect(card.locator('.badge', { hasText: '1/2' })).toBeVisible();

  // Rename a different step and save.
  await card.getByTitle('Edit').click();
  await page.locator('.modal-card .step-builder-row input').first().fill('Alpha renamed');
  await page.getByRole('button', { name: 'Save' }).click();

  // Beta's completion survives the edit.
  // possible flaky test failure here
  await expect(card.locator('.step-item-title', { hasText: 'Alpha renamed' })).toBeVisible();
  await expect(card.locator('.step-item', { hasText: 'Beta' })).toHaveClass(/step-done/);
  await expect(card.locator('.badge', { hasText: '1/2' })).toBeVisible();
});

test('can defer a multistep project via edit modal', async ({ page }) => {
  await addMultistepProject(page, 'Active Project', ['Step one']);
  const card = page.locator('.task-card', { hasText: 'Active Project' });
  await expect(card.locator('.badge-amber', { hasText: 'Deferred' })).not.toBeVisible();

  await card.getByTitle('Edit').click();
  await page.locator('.modal-card').getByLabel('Defer').check();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(card.locator('.badge-amber', { hasText: 'Deferred' })).toBeVisible();
});
