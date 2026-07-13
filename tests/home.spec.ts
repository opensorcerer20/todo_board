import {
  expect,
  test,
} from './fixtures';
import { goToTab } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

/**
 * Regression: when a project has an incomplete Day step followed by an incomplete
 * Night step, switching to Night mode was showing the Night step in the task list
 * even though the Day step (the actual current step) had not been completed yet.
 *
 * Only the current step (first incomplete overall) should appear in the task list,
 * and only when its dayNight matches the active domain.
 *
 * Note: the Night step correctly still appears in the Projects card as "On deck" —
 * this test scopes its assertions to the Tasks panel only.
 */
test('task list does not show a later step when an earlier step in a different domain is still incomplete', async ({ page }) => {
  await goToTab(page, 'Multistep');
  await page.getByPlaceholder('Task name…').fill('Mixed domain project');

  // Step 1: Day — this is the current step, it must be completed first
  await page.locator('.step-builder-row input[type="text"]').nth(0).fill('Current day step');
  await page.locator('.step-builder-row .step-day-night').nth(0).selectOption('day');

  // Step 2: Night — should not surface until Step 1 is done
  await page.getByText('+ Add Step').click();
  await page.locator('.step-builder-row input[type="text"]').nth(1).fill('Later night step');
  await page.locator('.step-builder-row .step-day-night').nth(1).selectOption('night');

  await page.getByRole('button', { name: 'Create Task' }).click();
  await goToTab(page, 'Home');

  const tasksPanel = page.getByTestId('tasks-panel');

  // The current step is Day — the Night step must never surface in the task list
  // regardless of which section is shown, because Step 1 is still incomplete.
  await expect(tasksPanel.getByText('Later night step')).not.toBeVisible();

  // The Day step (current) should appear in the Work/Errand section.
  await expect(tasksPanel.getByText('Current day step')).toBeVisible();
});
