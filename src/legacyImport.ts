import { DayNight } from './types';
import type { PlainTask, RepeatedTask, MultiStepProject, LogEntry } from './types';

const IMPORT_FLAG = 'legacy_import_done_20260624';

const STEP_DONE_DATE = '2026-06-24';

type LegacyTodo = {
  id: number; text: string; done: boolean;
  category: string; starred: boolean; completedOn: string | null;
};

type LegacyHabit = {
  id: number; name: string; logs: string[];
  category: string; starred: boolean; logWhen: string;
};

type LegacyStep = {
  text: string; category: string; starred: boolean; done: boolean;
};

type LegacyStepTask = {
  id: number; name: string; steps: LegacyStep[];
  category?: string; starred?: boolean; current?: number;
};

const raw: { todos: LegacyTodo[]; habits: LegacyHabit[]; stepTasks: LegacyStepTask[] } = {
  "todos": [
    { "id": 1781640516269, "text": "exchange co2", "done": true, "category": "night", "starred": false, "completedOn": "2026-06-17" },
    { "id": 1781640521965, "text": "mow back", "done": true, "category": "night", "starred": true, "completedOn": "2026-06-18" },
    { "id": 1781670466791, "text": "dentist", "done": true, "category": "day", "starred": true, "completedOn": "2026-06-22" },
    { "id": 1781693579074, "text": "add day/night to multistep", "done": true, "category": "day", "starred": false, "completedOn": "2026-06-18" },
    { "id": 1781693596473, "text": "schedule adhd", "done": true, "category": "day", "starred": true, "completedOn": "2026-06-22" },
    { "id": 1781693635590, "text": "add star option for tasks", "done": true, "category": "day", "starred": false, "completedOn": "2026-06-17" },
    { "id": 1781697243130, "text": "temp: kohl for interview duds", "done": true, "category": "day", "starred": true, "completedOn": "2026-06-17" },
    { "id": 1781701183301, "text": "body shaping academy", "done": true, "category": "day", "starred": true, "completedOn": "2026-06-17" },
    { "id": 1782021974654, "text": "split off todo board into repo", "done": false, "completedOn": null, "category": "night", "starred": true },
    { "id": 1782021987721, "text": "split off note taker into repo", "done": false, "completedOn": null, "category": "night", "starred": false },
    { "id": 1782021998320, "text": "upload note taker app", "done": false, "completedOn": null, "category": "night", "starred": false },
    { "id": 1782054085169, "text": "add pwa protect to flashcard", "done": false, "completedOn": null, "category": "night", "starred": true },
    { "id": 1782204757250, "text": "sign up for public daily project work", "done": false, "completedOn": null, "category": "night", "starred": true }
  ],
  "habits": [
    { "id": 1781640529914, "name": "only 12oz dr pepper", "logs": ["2026-06-13","2026-06-14","2026-06-15","2026-06-16","2026-06-17","2026-06-18","2026-06-19","2026-06-20","2026-06-21","2026-06-22","2026-06-23"], "category": "night", "starred": false, "logWhen": "yesterday" },
    { "id": 1781640544832, "name": "check to do board", "logs": ["2026-06-16","2026-06-17","2026-06-18","2026-06-19","2026-06-21","2026-06-23"], "category": "day", "starred": false, "logWhen": "today" },
    { "id": 1781644197409, "name": "pack a box", "logs": [], "category": "night", "starred": false, "logWhen": "today" },
    { "id": 1781860172674, "name": "post a creation", "logs": [], "category": "night", "starred": false, "logWhen": "today" },
    { "id": 1782205283569, "name": "post project progress", "logs": [], "category": "night", "logWhen": "today", "starred": false }
  ],
  "stepTasks": [
    { "id": 1781640614632, "name": "job", "steps": [
      { "text": "get interview duds", "category": "night", "starred": false, "done": true },
      { "text": "get duds fitted", "category": "day", "starred": false, "done": true },
      { "text": "dry cleaning", "category": "day", "starred": true, "done": true },
      { "text": "go to staffing", "category": "day", "starred": true, "done": false },
      { "text": "get job", "category": "day", "starred": false, "done": false },
      { "text": "follow dev job plan", "category": "day", "starred": false, "done": false },
      { "text": "get dev job", "category": "day", "starred": false, "done": false },
      { "text": "angle toward less dev heavy job", "category": "night", "starred": false, "done": false }
    ], "current": 5, "category": "night", "starred": false },
    { "id": 1781640861280, "name": "car", "steps": [
      { "text": "call usaa for instructions", "category": "night", "starred": false, "done": true },
      { "text": "monday: appointment for car", "category": "day", "starred": true, "done": false },
      { "text": "turo(?) rental", "category": "day", "starred": false, "done": false },
      { "text": "take in car, get rental", "category": "day", "starred": false, "done": false },
      { "text": "when car is ready, reverse", "category": "day", "starred": false, "done": false }
    ], "current": 1, "category": "night", "starred": false },
    { "id": 1781645178240, "name": "house", "steps": [
      { "text": "finish boxing", "starred": false, "category": "night", "done": false },
      { "text": "vacate main house of stuff", "starred": false, "category": "night", "done": false },
      { "text": "minimal living", "starred": false, "category": "night", "done": false },
      { "text": "sell house", "starred": false, "category": "night", "done": false }
    ], "current": 0, "category": "night", "starred": false },
    { "id": 1782021940083, "name": "holographic book", "steps": [
      { "text": "set up how the holo universe is set up in this world", "category": "night", "starred": false, "done": false },
      { "text": "start writing journals", "category": "night", "starred": false, "done": false },
      { "text": "finish journals", "category": "night", "starred": false, "done": false }
    ], "current": 0 }
  ]
};

function toDayNight(category: string | undefined): typeof DayNight[keyof typeof DayNight] {
  return category === 'day' ? DayNight.DAY : DayNight.NIGHT;
}

function mapTodos(): Omit<PlainTask, never>[] {
  return raw.todos.map(t => ({
    id: t.id,
    type: 'task' as const,
    title: t.text,
    completedAt: t.completedOn ?? null,
    createdAt: new Date(t.id).toISOString(),
    starred: t.starred,
    dayNight: toDayNight(t.category),
  }));
}

function mapHabits(): Omit<RepeatedTask, never>[] {
  return raw.habits.map(h => {
    const logs: LogEntry[] = h.logs.map(date => ({
      actionDate: date,
      recordedDate: date,
    }));
    return {
      id: h.id,
      type: 'repeated' as const,
      title: h.name,
      completedAt: null,
      createdAt: new Date(h.id).toISOString(),
      resetDay: 'daily' as const,
      logMode: (h.logWhen === 'yesterday' ? 'yesterday' : 'today') as 'today' | 'yesterday',
      logs,
      starred: h.starred,
      dayNight: toDayNight(h.category),
    };
  });
}

function mapStepTasks(): Omit<MultiStepProject, never>[] {
  return raw.stepTasks.map(p => {
    const createdAt = new Date(p.id).toISOString();
    return {
      id: p.id,
      type: 'multistep' as const,
      title: p.name,
      completedAt: null,
      createdAt,
      deferred: false,
      steps: p.steps.map(s => ({
        id: crypto.randomUUID(),
        type: 'task' as const,
        title: s.text,
        completedAt: s.done ? STEP_DONE_DATE : null,
        createdAt,
        starred: s.starred,
        dayNight: toDayNight(s.category),
        deferred: false,
      })),
    };
  });
}

function clearStore(db: IDBDatabase): Promise<void> {
  return new Promise((res, rej) => {
    const req = db.transaction('tasks', 'readwrite').objectStore('tasks').clear();
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

function insertAll(db: IDBDatabase, records: object[]): Promise<void> {
  return new Promise((res, rej) => {
    const tx    = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    for (const r of records) store.put(r);
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

export async function runLegacyImport(db: IDBDatabase): Promise<void> {
  if (localStorage.getItem(IMPORT_FLAG)) return;
  if (!new URLSearchParams(location.search).has('import')) return;

  await clearStore(db);
  await insertAll(db, [
    ...mapTodos(),
    ...mapHabits(),
    ...mapStepTasks(),
  ]);

  localStorage.setItem(IMPORT_FLAG, '1');
}
