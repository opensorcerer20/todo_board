import { DB_TEST_NAME, expect, test } from './fixtures';
import { addMultistepProject, goToTab } from './helpers';

// Use local date arithmetic to match what the app computes as "today"
// (same technique as tests/streak.spec.ts).
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

// Backdate every step's completedAt on a project, bypassing the UI — mirrors
// the externalPatch technique in tests/concurrency.spec.ts, but reaches into
// the nested steps array since steps have no top-level DB record of their own.
async function backdateSteps(page: import('@playwright/test').Page, projectTitle: string, completedAt: string) {
  await page.evaluate(
    ({ projectTitle, completedAt, db }) => new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(db);
      req.onsuccess = () => {
        const tx = req.result.transaction('tasks', 'readwrite');
        const store = tx.objectStore('tasks');
        const all = store.getAll();
        all.onsuccess = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const project = (all.result as any[]).find(r => r.title === projectTitle);
          if (!project) { reject(new Error('project not found: ' + projectTitle)); return; }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          project.steps = project.steps.map((s: any) => ({ ...s, completedAt }));
          store.put(project);
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    }),
    { projectTitle, completedAt, db: DB_TEST_NAME },
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('completing a multistep project moves it to the Completed section', async ({ page }) => {
  await addMultistepProject(page, 'Finish onboarding', ['Read the docs']);

  const card = page.locator('.task-card', { hasText: 'Finish onboarding' });
  await card.locator('input[type="checkbox"]').click();

  const completedSection = page.locator('.section-label', { hasText: 'Completed' });
  await expect(completedSection).toBeVisible();
  await expect(card.locator('.task-title')).toHaveClass(/completed/);

  // No longer under the Active column.
  const activeColumn = page.locator('.section-label', { hasText: 'Active' }).locator('..');
  await expect(activeColumn.getByText('Finish onboarding')).not.toBeVisible();
});

test('a completed multistep project is not visible the day after completion', async ({ page }) => {
  await addMultistepProject(page, 'Old project', ['Only step']);
  await page.locator('.task-card', { hasText: 'Old project' }).locator('input[type="checkbox"]').click();

  await expect(page.locator('.section-label', { hasText: 'Completed' })).toBeVisible();

  await backdateSteps(page, 'Old project', daysAgo(2));
  await page.reload();
  await goToTab(page, 'Multistep');

  await expect(page.getByText('Old project')).not.toBeVisible();
});
