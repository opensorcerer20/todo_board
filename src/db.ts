import { DayNight } from './types';
import type { AnyTask, PlainTask, RepeatedTask, MultiStepProject } from './types';

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

export function dbGetAll(db: IDBDatabase, type: 'task'): Promise<PlainTask[]>;
export function dbGetAll(db: IDBDatabase, type: 'repeated'): Promise<RepeatedTask[]>;
export function dbGetAll(db: IDBDatabase, type: 'multistep'): Promise<MultiStepProject[]>;
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

export function dbPut(db: IDBDatabase, item: AnyTask): Promise<number> {
  return new Promise((res, rej) => {
    const req = db.transaction('tasks', 'readwrite').objectStore('tasks').put(item);
    req.onsuccess = () => res(req.result as number);
    req.onerror = () => rej(req.error);
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

        // Fields for task and repeated types
        if (r.type === 'task' || r.type === 'repeated') {
          if (r.starred === undefined) { r.starred = false; changed = true; }
          if (r.dayNight === undefined) { r.dayNight = DayNight.NIGHT; changed = true; }
        }

        // Fields for multistep projects and their steps
        if (r.type === 'multistep') {
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

export function dbDelete(db: IDBDatabase, id: number): Promise<void> {
  return new Promise((res, rej) => {
    const req = db.transaction('tasks', 'readwrite').objectStore('tasks').delete(id);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}
