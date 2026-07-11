import type {
  ActivityEvent,
  AnyTask,
  MultiStepProject,
  PlainTask,
  RepeatedTask,
  RequestTask,
  TaskType,
} from './types';
import { ItemType } from './types';
import {
  activitySeedEvents,
  deepEqual,
} from './utils';

// Real database. A fresh, one-time name with the timestamp baked in at
// code-write time — NOT computed per load, so the name is stable and data
// persists across reloads. Started clean after the previous `task_board_v2`
// database was wiped; backed-up data is re-imported into this one.
export const DB_NAME = 'task_board_202607091451';

// Fixed, always-separate database used only under test, so tests can never
// read or overwrite the real DB. The app picks this up via an injected global
// (see tests/fixtures.ts); production never sets it and uses DB_NAME.
export const DB_TEST_NAME = 'task_board_test';

function dbName(): string {
  return (globalThis as unknown as { __TASKBOARD_DB__?: string }).__TASKBOARD_DB__ ?? DB_NAME;
}

const DB_VERSION = 2;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName(), DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('tasks'))
        db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });

      // v2: append-only activity log, seeded once from existing completion state.
      if (!db.objectStoreNames.contains('activity')) {
        const activity = db.createObjectStore('activity', { keyPath: 'id', autoIncrement: true });
        const getAll = req.transaction!.objectStore('tasks').getAll();
        getAll.onsuccess = () => {
          for (const ev of activitySeedEvents(getAll.result as AnyTask[])) activity.add(ev);
        };
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function dbGetAll(db: IDBDatabase, type: typeof ItemType.TASK): Promise<PlainTask[]>;
export function dbGetAll(db: IDBDatabase, type: typeof ItemType.REQUEST): Promise<RequestTask[]>;
export function dbGetAll(db: IDBDatabase, type: typeof ItemType.REPEATED): Promise<RepeatedTask[]>;
export function dbGetAll(db: IDBDatabase, type: typeof ItemType.MULTISTEP): Promise<MultiStepProject[]>;
export function dbGetAll(db: IDBDatabase, type: TaskType): Promise<AnyTask[]> {
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
 * Atomic read-modify-write for the completion actions (complete/uncomplete a
 * task or step, log a habit), plus an append to the activity log — both in one
 * readwrite transaction over `tasks` + `activity`. The mutator builds on the
 * freshest stored record (never clobbering a concurrent edit); `makeEvent`
 * receives that record and returns the event to append.
 */
export function dbApplyLogged<T extends AnyTask>(
  db: IDBDatabase,
  id: number | string,
  mutate: (current: T) => T,
  makeEvent: (before: T) => Omit<ActivityEvent, 'id'>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx       = db.transaction(['tasks', 'activity'], 'readwrite');
    const tasks    = tx.objectStore('tasks');
    const activity = tx.objectStore('activity');
    const getReq   = tasks.get(id);
    getReq.onsuccess = () => {
      const before = getReq.result as T | undefined;
      if (!before) { reject(new ConflictError([])); return; }
      const next = mutate(before);
      tasks.put(next);
      activity.add(makeEvent(before));
      tx.oncomplete = () => resolve(next);
      tx.onerror    = () => reject(tx.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/** Reads the full append-only activity log, oldest event first. */
export function dbGetActivity(db: IDBDatabase): Promise<ActivityEvent[]> {
  return new Promise((resolve, reject) => {
    const req = db.transaction('activity', 'readonly').objectStore('activity').getAll();
    req.onsuccess = () => {
      const events = req.result as ActivityEvent[];
      events.sort((a, b) => a.at.localeCompare(b.at) || a.id - b.id);
      resolve(events);
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
