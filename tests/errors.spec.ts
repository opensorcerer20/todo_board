import { expect, test } from './fixtures';
import { addTask } from './helpers';

// Simulates a failed database operation by closing the app's live IDBDatabase
// connection right before triggering an action. `db.transaction(...)` throws
// synchronously once the connection is closed, so every dbAdd/dbApplyLogged/
// dbDelete/dbUpdateSafe call rejects — exercising the same failure path a real
// IndexedDB error (quota, corruption, etc.) would take.
async function closeAppDb(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    (window as unknown as { __closeTaskboardDbForTest__: () => void }).__closeTaskboardDbForTest__();
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const origOpen = indexedDB.open.bind(indexedDB);
    (indexedDB as unknown as { open: typeof indexedDB.open }).open = (...args: Parameters<typeof indexedDB.open>) => {
      const req = origOpen(...args);
      req.addEventListener('success', () => {
        (window as unknown as { __closeTaskboardDbForTest__?: () => void }).__closeTaskboardDbForTest__ =
          () => req.result.close();
      });
      return req;
    };
  });
  await page.goto('/');
  await addTask(page, 'Doomed task');
  // Wait for the add to actually land in the UI before closing the connection —
  // otherwise closing mid-flight can abort the in-progress load() itself.
  await expect(page.locator('.task-card', { hasText: 'Doomed task' })).toBeVisible();
});

test('a failed delete shows an inline error banner that can be dismissed', async ({ page }) => {
  await closeAppDb(page);

  await page.locator('.task-card', { hasText: 'Doomed task' }).getByTitle('Delete').click();
  await page.getByRole('button', { name: 'Confirm' }).click();

  const banner = page.getByRole('alert').filter({ hasText: "Couldn't delete task" });
  await expect(banner).toBeVisible();

  // The card is still there — the delete never actually happened.
  await expect(page.locator('.task-card', { hasText: 'Doomed task' })).toBeVisible();

  await banner.getByRole('button').click();
  await expect(banner).not.toBeVisible();
});

test('a failed save shows an inline error banner distinct from the conflict banner', async ({ page }) => {
  await page.locator('.task-card', { hasText: 'Doomed task' }).getByTitle('Edit').click();
  await closeAppDb(page);

  await page.locator('.modal-card input[type="text"]').fill('Doomed task edited');
  await page.getByRole('button', { name: 'Save' }).click();

  const banner = page.getByRole('alert').filter({ hasText: "Couldn't save" });
  await expect(banner).toBeVisible();
  await expect(page.getByText(/changed in another tab/i)).not.toBeVisible();

  // The modal stays open and the edit was not persisted.
  await expect(page.locator('.modal-card')).toBeVisible();
});
