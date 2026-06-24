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

export function dbDelete(db: IDBDatabase, id: number): Promise<void> {
  return new Promise((res, rej) => {
    const req = db.transaction('tasks', 'readwrite').objectStore('tasks').delete(id);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}
