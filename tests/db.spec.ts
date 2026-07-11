import { test, expect, DB_TEST_NAME } from './fixtures';
import { goToTab } from './helpers';

// Confirms the app builds its IndexedDB from nothing without error: the first
// ever load (no existing database) must create both object stores via
// onupgradeneeded and render normally, with no console/page errors.

test('first load with no existing database creates it and renders cleanly', async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  // Snapshot the list of databases before any app code runs, to confirm the
  // premise of this test: the test DB genuinely does not exist yet.
  await page.addInitScript(() => {
    (window as unknown as { __dbsBeforeLoad__?: Promise<IDBDatabaseInfo[]> }).__dbsBeforeLoad__ =
      indexedDB.databases();
  });

  await page.goto('/');

  const dbsBeforeLoad = await page.evaluate(
    () => (window as unknown as { __dbsBeforeLoad__: Promise<IDBDatabaseInfo[]> }).__dbsBeforeLoad__,
  );
  expect(dbsBeforeLoad.map(d => d.name)).not.toContain(DB_TEST_NAME);

  // App opens on Home — proves the initial dbGetAll calls it fires resolved
  // against a freshly created (empty) 'tasks' store, not an error.
  await expect(page.getByText('No active projects')).toBeVisible();

  // Empty states render on every other tab too.
  await goToTab(page, 'Tasks');
  await expect(page.locator('.empty-state', { hasText: 'No tasks yet' })).toBeVisible();

  await goToTab(page, 'Repeat Tasks');
  await expect(page.locator('.empty-state', { hasText: 'No repeat tasks yet' })).toBeVisible();

  await goToTab(page, 'Multistep');
  await expect(page.locator('.empty-state', { hasText: 'No multistep tasks yet' })).toBeVisible();

  // Both object stores exist, created purely by onupgradeneeded on this first open.
  const storeNames = await page.evaluate((db) => new Promise<string[]>((resolve, reject) => {
    const req = indexedDB.open(db);
    req.onsuccess = () => resolve(Array.from(req.result.objectStoreNames));
    req.onerror = () => reject(req.error);
  }), DB_TEST_NAME);
  expect(storeNames.sort()).toEqual(['activity', 'tasks']);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
