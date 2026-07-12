import { readFileSync } from 'node:fs';
import {
  dirname,
  join,
} from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AnyTask } from '../src/types';
import { ItemType } from '../src/types';
import {
  DB_TEST_NAME,
  expect,
  test,
} from './fixtures';
import { goToTab } from './helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'screenshots');

// ── Local date helpers (mirror the app's local-date logic in src/utils.ts) ──

function todayStr(): string {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, '0'), String(dt.getDate()).padStart(2, '0')].join('-');
}

function daysBetween(from: string, to: string): number {
  const [ay, am, ad] = from.split('-').map(Number);
  const [by, bm, bd] = to.split('-').map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((b - a) / 86_400_000);
}

/** Shift a YYYY-MM-DD (or ISO datetime) date field forward by `offset` days. */
function shiftDate(value: string, offset: number): string {
  const isIso = value.includes('T');
  const shifted = addDays(value.slice(0, 10), offset);
  return isIso ? shifted + value.slice(10) : shifted;
}

/**
 * Throws if `value` is present but not a YYYY-MM-DD(-prefixed) string. A
 * missing value (null/undefined) is fine — callers already skip those. This
 * only guards against a present-but-malformed value silently producing NaN
 * dates downstream (e.g. from a hand-edited sample-data.json).
 */
function assertValidDate(value: string | null | undefined, context: string): void {
  if (value != null && !/^\d{4}-\d{2}-\d{2}/.test(value)) {
    throw new Error(`freshen: malformed date "${value}" on ${context} — check sample-data.json`);
  }
}

/**
 * Freshen the exported sample data so the board looks alive relative to today:
 *  - slide every date forward so the most recent activity lands on today,
 *  - force a few already-completed tasks onto today (visible crossed-out),
 *  - regenerate the daily habit's logs as a consecutive run ending today.
 */
function freshen(records: AnyTask[]): AnyTask[] {
  const today = todayStr();

  // Largest date anywhere in the dataset → becomes "today".
  let maxDate = '';
  const collect = (v?: string | null) => { if (v && v.slice(0, 10) > maxDate) maxDate = v.slice(0, 10); };
  for (const r of records) {
    const recordContext = `${r.type} "${r.title}" (id ${r.id})`;
    assertValidDate(r.createdAt, `${recordContext}.createdAt`);
    assertValidDate(r.completedAt, `${recordContext}.completedAt`);
    collect(r.createdAt); collect(r.completedAt);
    if (r.type === ItemType.MULTISTEP) {
      for (const s of r.steps) {
        const stepContext = `step "${s.title}" (id ${s.id}) of project "${r.title}"`;
        assertValidDate(s.createdAt, `${stepContext}.createdAt`);
        assertValidDate(s.completedAt, `${stepContext}.completedAt`);
        collect(s.createdAt); collect(s.completedAt);
      }
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(maxDate)) {
    throw new Error(`freshen: no valid YYYY-MM-DD date found in sample data (got "${maxDate}") — check sample-data.json for a malformed or missing date field`);
  }
  const offset = daysBetween(maxDate, today);

  const shifted = records.map(r => {
    const out: AnyTask = { ...r };
    if (out.createdAt)   out.createdAt   = shiftDate(out.createdAt, offset);
    if (out.completedAt) out.completedAt = shiftDate(out.completedAt, offset);
    if (out.type === ItemType.MULTISTEP) {
      out.steps = out.steps.map(s => ({
        ...s,
        createdAt:   s.createdAt   ? shiftDate(s.createdAt, offset)   : s.createdAt,
        completedAt: s.completedAt ? shiftDate(s.completedAt, offset) : s.completedAt,
      }));
    }
    return out;
  });

  // Surface a few "completed today" tasks so the crossed-out state is visible.
  // Asserted below (not just filtered) so a fixture rename/typo fails loudly
  // instead of silently skipping the visual this file exists to demonstrate.
  const doneToday = new Set(['dentist', 'add star option for tasks', 'split off todo board into repo']);
  let matched = 0;
  for (const r of shifted) {
    if (r.type === ItemType.TASK && doneToday.has(r.title)) { r.completedAt = today; matched++; }
  }
  if (matched !== doneToday.size) {
    throw new Error(`freshen: expected to find ${doneToday.size} "done today" tasks in sample-data.json, found ${matched}`);
  }

  // Regenerate the daily habit's logs as 12 consecutive days ending today.
  for (const r of shifted) {
    if (r.type === ItemType.REPEATED && r.resetDay === 'daily') {
      r.logs = Array.from({ length: 12 }, (_, i) => {
        const d = addDays(today, -(11 - i));
        return { actionDate: d, recordedDate: d };
      });
    }
  }

  return shifted;
}

const raw = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'sample-data.json'), 'utf8'));
const SAMPLE = freshen(raw);

test('capture app screenshots', async ({ page }) => {
  // First load creates the object stores via onupgradeneeded (DB_VERSION-gated).
  await page.goto('/');
  await page.waitForSelector('.app');

  // Seed every record straight into IndexedDB (put preserves ids). No version
  // argument — attach to whatever version the app's own openDB() already
  // established above, so this never drifts out of sync with DB_VERSION.
  await page.evaluate(async ({ records, db: dbName }) => {
    await new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('tasks', 'readwrite');
        const store = tx.objectStore('tasks');
        store.clear();
        for (const r of records) store.put(r);
        tx.oncomplete = () => resolve(undefined);
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }, { records: SAMPLE, db: DB_TEST_NAME });

  async function setTheme(theme: 'light' | 'dark') {
    await page.evaluate(t => localStorage.setItem('theme', t), theme);
    // Each page.reload() re-runs app init/openDB() against the same DB_TEST_NAME,
    // which is fine since it's already seeded
    await page.reload();
    await page.waitForSelector('.app');
  }

  // ── Home: light, then dark ──
  await setTheme('light');
  await goToTab(page, 'Home');
  await expect(page.getByText('Active projects')).toBeVisible();
  await page.screenshot({ path: join(OUT, 'home-light.png') });

  await setTheme('dark');
  await goToTab(page, 'Home');
  await expect(page.getByText('Active projects')).toBeVisible();
  await page.screenshot({ path: join(OUT, 'home-dark.png') });

  // ── Remaining tabs: dark, full page ──
  await goToTab(page, 'Tasks');
  await expect(page.getByPlaceholder('What needs to be done?')).toBeVisible();
  await page.screenshot({ path: join(OUT, 'tasks-dark.png'), fullPage: true });

  await goToTab(page, 'Repeat Tasks');
  await expect(page.getByPlaceholder('Habit or recurring task…')).toBeVisible();
  await page.screenshot({ path: join(OUT, 'repeat-tasks-dark.png'), fullPage: true });

  await goToTab(page, 'Multistep');
  await expect(page.getByPlaceholder('Task name…')).toBeVisible();
  await page.screenshot({ path: join(OUT, 'multistep-dark.png'), fullPage: true });
});
