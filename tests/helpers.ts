import type { Page } from '@playwright/test';
import { ItemType } from '../src/types';
import { DB_TEST_NAME } from '../src/db';

export function goToTab(page: Page, label: string) {
  return page.getByRole('button', { name: label, exact: true }).click();
}

// Local date arithmetic matching what the app computes as "today"
// (same technique used across the streak / multistep specs).
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

// Apply partial patches to a project's steps by index, bypassing the UI.
// patches[i] is shallow-merged onto the existing step at index i; entries left
// undefined are skipped. Mirrors the nested-steps injection in the multistep specs.
export async function patchSteps(
  page: Page,
  projectTitle: string,
  patches: (Record<string, unknown> | undefined)[],
) {
  await page.evaluate(
    ({ projectTitle, patches, db }) => new Promise<void>((resolve, reject) => {
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
          project.steps = project.steps.map((s: any, i: number) =>
            patches[i] ? { ...s, ...patches[i] } : s);
          store.put(project);
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    }),
    { projectTitle, patches, db: DB_TEST_NAME },
  );
}

export async function addDayHabit(page: Page, title: string, starred = false) {
  await goToTab(page, 'Repeat Tasks');
  if (starred) await page.locator('.add-form .btn-star').click();
  await page.getByPlaceholder('Habit or recurring task…').fill(title);
  await page.locator('.form-group', { hasText: 'Time' }).locator('select').selectOption('day');
  await page.getByRole('button', { name: 'Add' }).click();
}

export async function addTask(page: Page, title: string, dayNight: 'day' | 'night' = 'night') {
  await goToTab(page, 'Tasks');
  await page.getByPlaceholder('What needs to be done?').fill(title);
  if (dayNight === 'day') {
    await page.locator('.add-form .form-group', { hasText: 'Time' }).locator('select').selectOption('day');
  }
  await page.getByRole('button', { name: 'Add' }).click();
}

export async function addRequest(page: Page, title: string) {
  await goToTab(page, 'Tasks');
  await page.locator('.add-form .form-group', { hasText: 'Type' }).locator('select').selectOption(ItemType.REQUEST);
  await page.getByPlaceholder('What needs to be done?').fill(title);
  await page.getByRole('button', { name: 'Add' }).click();
}

export async function addRepeatedTask(page: Page, title: string) {
  await goToTab(page, 'Repeat Tasks');
  await page.getByPlaceholder('Habit or recurring task…').fill(title);
  await page.getByRole('button', { name: 'Add' }).click();
}

export async function addMultistepProject(page: Page, projectTitle: string, steps: string[]) {
  await goToTab(page, 'Multistep');
  await page.getByPlaceholder('Task name…').fill(projectTitle);
  for (let i = 0; i < steps.length; i++) {
    if (i > 0) await page.getByText('+ Add Step').click();
    await page.locator('.step-builder-row input[type="text"]').nth(i).fill(steps[i]);
  }
  await page.getByRole('button', { name: 'Create Task' }).click();
}
