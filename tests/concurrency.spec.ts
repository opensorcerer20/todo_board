import { test, expect, type Page } from '@playwright/test';
import { addTask } from './helpers';

// ── "Second tab" helpers: mutate IndexedDB directly, bypassing the app ─────────

// Shallow-merge a patch onto the first record matching `title`.
async function externalPatch(page: Page, title: string, patch: Record<string, unknown>) {
  await page.evaluate(
    ({ title, patch }) => new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('task_board_v2', 1);
      req.onsuccess = () => {
        const tx = req.result.transaction('tasks', 'readwrite');
        const store = tx.objectStore('tasks');
        const all = store.getAll();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        all.onsuccess = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rec = (all.result as any[]).find(r => r.title === title);
          if (!rec) { reject(new Error('record not found: ' + title)); return; }
          Object.assign(rec, patch);
          store.put(rec);
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    }),
    { title, patch },
  );
}

async function externalDelete(page: Page, title: string) {
  await page.evaluate(
    (title) => new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('task_board_v2', 1);
      req.onsuccess = () => {
        const tx = req.result.transaction('tasks', 'readwrite');
        const store = tx.objectStore('tasks');
        const all = store.getAll();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        all.onsuccess = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rec = (all.result as any[]).find(r => r.title === title);
          if (rec) store.delete(rec.id);
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    }),
    title,
  );
}

// Read the first record matching `title`, or null.
async function readByTitle(page: Page, title: string) {
  return page.evaluate(
    (title) => new Promise<Record<string, unknown> | null>((resolve, reject) => {
      const req = indexedDB.open('task_board_v2', 1);
      req.onsuccess = () => {
        const all = req.result.transaction('tasks', 'readonly').objectStore('tasks').getAll();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        all.onsuccess = () => resolve((all.result as any[]).find(r => r.title === title) ?? null);
        all.onerror = () => reject(all.error);
      };
      req.onerror = () => reject(req.error);
    }),
    title,
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// ── Tests ──────────────────────────────────────────────────────────────────────

test('non-colliding external change is preserved on save', async ({ page }) => {
  await addTask(page, 'Concurrent A');
  await page.locator('.task-card', { hasText: 'Concurrent A' }).getByTitle('Edit').click();

  // Another tab completes the task (different field than the one being edited).
  await externalPatch(page, 'Concurrent A', { completedAt: '2026-01-01' });

  // We edit only the title, then save.
  await page.locator('.modal-card input[type="text"]').fill('Concurrent A edited');
  await page.getByRole('button', { name: 'Save' }).click();

  // Save succeeds (modal closes), and BOTH changes survive.
  await expect(page.locator('.modal-card')).not.toBeVisible();
  const rec = await readByTitle(page, 'Concurrent A edited');
  expect(rec).not.toBeNull();
  expect(rec!.completedAt).toBe('2026-01-01');
});

test('colliding edit shows conflict banner and does not overwrite', async ({ page }) => {
  await addTask(page, 'Collide B');
  await page.locator('.task-card', { hasText: 'Collide B' }).getByTitle('Edit').click();

  // Another tab edits the SAME field we are editing.
  await externalPatch(page, 'Collide B', { title: 'Collide B external' });

  await page.locator('.modal-card input[type="text"]').fill('Collide B mine');
  await page.getByRole('button', { name: 'Save' }).click();

  // Conflict banner shown, modal stays open, our change not written.
  await expect(page.getByText(/changed in another tab/i)).toBeVisible();
  await expect(page.locator('.modal-card')).toBeVisible();
  expect(await readByTitle(page, 'Collide B external')).not.toBeNull();
  expect(await readByTitle(page, 'Collide B mine')).toBeNull();
});

test('editing a record deleted in another tab shows conflict (no resurrection)', async ({ page }) => {
  await addTask(page, 'Delete C');
  await page.locator('.task-card', { hasText: 'Delete C' }).getByTitle('Edit').click();

  await externalDelete(page, 'Delete C');

  await page.locator('.modal-card input[type="text"]').fill('Delete C edited');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText(/changed in another tab/i)).toBeVisible();
  expect(await readByTitle(page, 'Delete C')).toBeNull();
  expect(await readByTitle(page, 'Delete C edited')).toBeNull();
});

test('quick complete does not clobber a concurrent external edit', async ({ page }) => {
  await addTask(page, 'Toggle D');

  // Another tab renames the task; our page still shows the stale title.
  await externalPatch(page, 'Toggle D', { title: 'Toggle D external' });

  // Toggle complete from the stale card — dbApply reads the freshest record.
  await page.locator('.task-card', { hasText: 'Toggle D' }).locator('input[type="checkbox"]').click();

  const rec = await readByTitle(page, 'Toggle D external');
  expect(rec).not.toBeNull();
  expect(rec!.completedAt).not.toBeNull();
});
