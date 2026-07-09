import { DayNight, ItemType } from './types';
import type { AnyTask, PlainTask, RequestTask, RepeatedTask, MultiStepProject } from './types';
import { deepEqual } from './utils';

const DB_NAME = 'task_board_v2';

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('tasks'))
        req.result.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function dbGetAll(db: IDBDatabase, type: typeof ItemType.TASK): Promise<PlainTask[]>;
export function dbGetAll(db: IDBDatabase, type: typeof ItemType.REQUEST): Promise<RequestTask[]>;
export function dbGetAll(db: IDBDatabase, type: typeof ItemType.REPEATED): Promise<RepeatedTask[]>;
export function dbGetAll(db: IDBDatabase, type: typeof ItemType.MULTISTEP): Promise<MultiStepProject[]>;
export function dbGetAll(db: IDBDatabase, type: string): Promise<AnyTask[]> {
  return new Promise((res, rej) => {
    const req = db.transaction('tasks', 'readonly').objectStore('tasks').getAll();
    req.onsuccess = () => res((req.result as AnyTask[]).filter(t => t.type === type));
    req.onerror = () => rej(req.error);
  });
}

export function dbAdd(db: IDBDatabase, item: Omit<AnyTask, 'id'>): Promise<number> {
  return new Promise((res, rej) => {
    const req = db.transaction('tasks', 'readwrite').objectStore('tasks').add(item);
    req.onsuccess = () => res(req.result as number);
    req.onerror = () => rej(req.error);
  });
}

/**
 * Thrown by dbUpdateSafe when the stored record changed under an open edit
 * modal. `fields` lists the colliding keys (empty = the record was deleted
 * in another tab).
 */
export class ConflictError extends Error {
  fields: string[];
  constructor(fields: string[]) {
    super(
      fields.length
        ? `Record changed in another tab (conflicting fields: ${fields.join(', ')})`
        : 'Record was deleted in another tab',
    );
    this.name = 'ConflictError';
    this.fields = fields;
  }
}

/**
 * Conflict-safe partial write for edit modals.
 *
 * Re-reads the current record inside the same readwrite transaction, diffs it
 * against `original` (the snapshot captured when the modal opened), and:
 *   • rejects with ConflictError if the record was deleted, or if any edited
 *     field also changed externally (collision);
 *   • otherwise writes only `edits` merged onto the current record, so
 *     non-colliding external changes are preserved.
 *
 * The single transaction is what makes this race-free: IndexedDB serializes
 * readwrite transactions across tabs.
 */
export function dbUpdateSafe<T extends AnyTask>(
  db: IDBDatabase,
  original: T,
  edits: Partial<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const store  = db.transaction('tasks', 'readwrite').objectStore('tasks');
    const getReq = store.get(original.id);
    getReq.onsuccess = () => {
      const current = getReq.result as T | undefined;
      if (!current) { reject(new ConflictError([])); return; }
      const collisions = (Object.keys(edits) as (keyof T)[])
        .filter(k => !deepEqual(current[k], original[k]));
      if (collisions.length) { reject(new ConflictError(collisions as string[])); return; }
      const merged = { ...current, ...edits };
      const putReq = store.put(merged);
      putReq.onsuccess = () => resolve(merged);
      putReq.onerror   = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Atomic read-modify-write for quick single-field writes (complete task, Log
 * habit, complete step). The mutator builds on the freshest stored record, so
 * these writes only touch their own field and never clobber a concurrent edit.
 */
export function dbApply<T extends AnyTask>(
  db: IDBDatabase,
  id: number | string,
  mutate: (current: T) => T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const store  = db.transaction('tasks', 'readwrite').objectStore('tasks');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const current = getReq.result as T | undefined;
      if (!current) { reject(new ConflictError([])); return; }
      const next = mutate(current);
      const putReq = store.put(next);
      putReq.onsuccess = () => resolve(next);
      putReq.onerror   = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Backfills missing fields on existing records.
 * Runs once on page load; skips records that are already complete.
 */
export function migrateDB(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const req   = store.getAll();

    req.onsuccess = () => {
      const records = req.result as Record<string, unknown>[];
      for (const r of records) {
        let changed = false;

        // Fields for task, request, and repeated types
        if (r.type === ItemType.TASK || r.type === ItemType.REQUEST || r.type === ItemType.REPEATED) {
          if (r.starred === undefined) { r.starred = false; changed = true; }
          if (r.dayNight === undefined) { r.dayNight = DayNight.NIGHT; changed = true; }
        }

        // Fields for multistep projects and their steps
        if (r.type === ItemType.MULTISTEP) {
          if (r.deferred === undefined) { r.deferred = false; changed = true; }
          const steps = r.steps as Record<string, unknown>[] | undefined;
          if (Array.isArray(steps)) {
            for (const s of steps) {
              if (s.starred === undefined)  { s.starred = false; changed = true; }
              if (s.dayNight === undefined) { s.dayNight = DayNight.NIGHT; changed = true; }
              if (s.deferred === undefined) { s.deferred = false; changed = true; }
            }
          }
        }

        if (changed) store.put(r);
      }

      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    };

    req.onerror = () => reject(req.error);
  });
}

export function dbExportAll(db: IDBDatabase): Promise<AnyTask[]> {
  return new Promise((res, rej) => {
    const req = db.transaction('tasks', 'readonly').objectStore('tasks').getAll();
    req.onsuccess = () => res(req.result as AnyTask[]);
    req.onerror = () => rej(req.error);
  });
}

export function dbDelete(db: IDBDatabase, id: number): Promise<void> {
  return new Promise((res, rej) => {
    const req = db.transaction('tasks', 'readwrite').objectStore('tasks').delete(id);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}
