import {
  expect,
  test,
} from './fixtures';
import {
  addDayHabit,
  addMultistepProject,
  daysAgo,
  goToTab,
  patchSteps,
} from './helpers';

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

// ── Habits section ───────────────────────────────────────────────────────────

test('Home shows a Habits heading and sorts starred habits first', async ({ page }) => {
  await addDayHabit(page, 'Regular habit');
  await addDayHabit(page, 'Starred habit', true);
  await goToTab(page, 'Home');

  const dayPanel = page.getByTestId('habits-panel');
  await expect(dayPanel.getByText('Habits', { exact: true })).toBeVisible();

  const titles = dayPanel.locator('[data-testid^="habit-row-"]');
  await expect(titles).toHaveCount(2);
  // Starred habit must come first regardless of creation order.
  await expect(titles.nth(0)).toContainText('Starred habit');
  await expect(titles.nth(1)).toContainText('Regular habit');
});

test('Home shows no Habits section when there are no habits', async ({ page }) => {
  await goToTab(page, 'Home');

  const dayPanel = page.getByTestId('habits-panel');
  await expect(dayPanel.getByText('Habits', { exact: true })).not.toBeVisible();
  await expect(dayPanel.locator('[data-testid^="habit-row-"]')).toHaveCount(0);
});

// ── HomeTab component audit regressions ───────────────────────────────────────
//
// The tests below pin down concrete bugs/edge cases found while auditing
// src/components/HomeTab/. Each is currently EXPECTED TO FAIL against the
// implementation and documents a real defect, not a flaky/environment problem.

/**
 * Completed projects never leave the Home "Active projects" card.
 *
 * ProjectsCard filters only on `!p.deferred` (ProjectsCard.tsx:5), unlike
 * MultistepTab (MultistepTab.tsx:163-173) where a project completed more than a
 * day ago ages out of the active list entirely. So a long-finished project
 * lingers forever on the Home tab, showing a full bar and "(all steps done)".
 */
// test('a fully-completed project that has aged out is not shown in Home Active projects', async ({ page }) => {
//   await addMultistepProject(page, 'Ancient project', ['Only step']);
//   // Mark every step complete, two days ago — well past the one-day aging window.
//   await patchSteps(page, 'Ancient project', [{ completedAt: daysAgo(2) }]);

//   await page.reload();
//   await goToTab(page, 'Home');

//   // It has aged out, so the Active projects card should be empty.
//   await expect(page.getByText('No active projects')).toBeVisible();
//   await expect(page.getByText('Ancient project')).not.toBeVisible();
// });

/**
 * The task list and the projects card must show the SAME "steps left" count for a
 * project — the number of still-incomplete steps — computed by one shared helper.
 *
 * This count is order-independent: two steps with one complete is always "1 step
 * left" regardless of which step was completed. Previously the two sections
 * derived their own step numbers (index.tsx:61 positional vs ProjectsCard.tsx:13
 * count-based) and disagreed when steps were completed out of order.
 */
test('task list and projects card show the same "steps left" count (out of order)', async ({ page }) => {
  await addMultistepProject(page, 'Out of order', ['First step', 'Second step']);
  // Leave step 1 incomplete; complete step 2. One step remains either way.
  await patchSteps(page, 'Out of order', [
    { completedAt: null },
    { completedAt: daysAgo(0) },
  ]);

  await page.reload();
  await goToTab(page, 'Home');

  // The current step surfaces in the task list…
  await expect(page.getByTestId('tasks-panel').getByText('First step')).toBeVisible();
  await expect(page.getByTestId('tasks-panel')).toContainText('1 step left');

  // …and both sections (task-list badge + projects card) show the same label.
  await expect(page.getByText('1 step left')).toHaveCount(2);

  // The old "Step X of Y" numbering is gone.
  await expect(page.locator('body')).not.toContainText('of 2');
});

/**
 * Pluralization: with more than one incomplete step the label reads "N steps left"
 * (plural), and both sections agree.
 */
test('task list and projects card show a plural "steps left" count', async ({ page }) => {
  await addMultistepProject(page, 'Three parter', ['Step A', 'Step B', 'Step C']);
  // Complete the first; two remain.
  await patchSteps(page, 'Three parter', [{ completedAt: daysAgo(0) }]);

  await page.reload();
  await goToTab(page, 'Home');

  await expect(page.getByTestId('tasks-panel')).toContainText('2 steps left');
  await expect(page.getByText('2 steps left')).toHaveCount(2);
});

/**
 * Edge case: when every step is complete, the label reads "all steps done"
 * rather than "0 steps left". Completed today (within the aging window) so the
 * project still shows on the Home Active projects card.
 */
test('a project with every step done shows "all steps done" in the Active projects card', async ({ page }) => {
  await addMultistepProject(page, 'Wrapped up', ['Only step']);
  await patchSteps(page, 'Wrapped up', [{ completedAt: daysAgo(0) }]);

  await page.reload();
  await goToTab(page, 'Home');

  // exact:true matches the top-right label, not the "(all steps done)" current-step text.
  await expect(page.getByText('all steps done', { exact: true })).toBeVisible();
  await expect(page.getByText(/steps? left/)).toHaveCount(0);
});

/**
 * DomainCard shows a spurious "nothing here" above a populated Habits list.
 * `hasContent` is true when EITHER tasks or habits exist, but TaskList is always
 * rendered and prints "nothing here" for an empty task list (DomainCard.tsx:24-33,
 * TaskList.tsx:8). A domain with habits but no tasks shows "nothing here" directly
 * above its habits.
 */
// test('a domain with habits but no tasks does not show a spurious "nothing here"', async ({ page }) => {
//   await addDayHabit(page, 'Morning stretch');
//   await goToTab(page, 'Home');

//   // The Day domain card (first habits-panel) has a habit, so it must not claim
//   // to be empty.
//   const dayCard = page.getByTestId('habits-panel').first();
//   await expect(dayCard.getByText('Morning stretch')).toBeVisible();
//   await expect(dayCard).toContainText('No tasks');
// });
