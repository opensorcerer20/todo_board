import { test as base, expect } from '@playwright/test';
import { DB_TEST_NAME } from '../src/db';

/**
 * Custom `test` that runs the app against an isolated, throwaway database
 * (DB_TEST_NAME) instead of the real one (DB_NAME). An init script sets the
 * `__TASKBOARD_DB__` global before any app code runs, so `openDB` opens the
 * test DB. This makes it impossible for a test to read or overwrite real data,
 * even if accidentally pointed at a real browser.
 *
 * All spec files import { test, expect } from './fixtures' (not '@playwright/test').
 * Direct IndexedDB helpers should open `DB_TEST_NAME`, never a literal name.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((name) => {
      (window as unknown as { __TASKBOARD_DB__?: string }).__TASKBOARD_DB__ = name;
    }, DB_TEST_NAME);
    await use(page);
  },
});

export { expect };
export { DB_TEST_NAME };
