import type { DayDataAdapter, Habit } from './types';
import type { Item } from '../lib/sorting';

export function createMockAdapter(seed: { items?: Item[]; habits?: Habit[] } = {}): DayDataAdapter {
  let items: Item[] = structuredClone(seed.items ?? DEFAULT_ITEMS);
  let habits: Habit[] = structuredClone(seed.habits ?? DEFAULT_HABITS);
  let nextId = Math.max(0, ...items.map(i => Number(i.id) || 0)) + 1;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(cb => cb());
  const delay = () => new Promise<void>(r => setTimeout(r, 120));

  return {
    async getItems()  { await delay(); return structuredClone(items); },
    async getHabits() { await delay(); return structuredClone(habits); },

    async addItem(input) {
      await delay();
      const item: Item = {
        id: nextId++,
        title: input.title ?? '',
        type: input.type ?? 'task',
        meta: input.meta ?? '',
        deferred: 0,
        starred: !!input.starred,
        done: false,
      };
      items = [...items, item];
      emit();
      return structuredClone(item);
    },

    async setDone(id, done) {
      await delay();
      items = items.map(it => it.id === id ? { ...it, done } : it);
      emit();
    },

    async deferItem(id) {
      await delay();
      items = items.map(it => it.id === id ? { ...it, deferred: (it.deferred || 0) + 1 } : it);
      emit();
    },

    async logProgress(id, note) {
      await delay();
      console.info('[logProgress]', id, note ?? '');
      emit();
    },

    async logHabit(id) {
      await delay();
      habits = habits.map(h =>
        h.id === id ? { ...h, logs: (h.logs ?? 0) + 1, daysSinceLast: 0 } : h
      );
      emit();
    },

    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

export const DEFAULT_ITEMS: Item[] = [
  { id: 1, title: 'Send Q3 budget to Mara',    type: 'task',    meta: 'Due 4pm',                          deferred: 0, starred: true,  done: false },
  { id: 2, title: 'Call the dentist back',       type: 'errand',  meta: '',                                 deferred: 2, starred: false, done: false },
  { id: 3, title: 'Finalize homepage copy',      type: 'project', meta: 'Website redesign · Step 4 of 9',  deferred: 0, starred: true,  done: false },
  { id: 4, title: 'Reply to vendor contract',    type: 'task',    meta: '',                                 deferred: 1, starred: false, done: false },
  { id: 5, title: 'Finish Unit 3 grammar',       type: 'project', meta: 'Learn Spanish · Step 3 of 12',    deferred: 0, starred: false, done: false },
  { id: 6, title: 'Renew passport',              type: 'errand',  meta: '',                                 deferred: 5, starred: false, done: false },
  { id: 7, title: 'Review Sam’s side project', type: 'request', meta: 'optional · asked Mon',          deferred: 3, starred: false, done: false },
];

export const DEFAULT_HABITS: Habit[] = [
  { id: 'h1', title: 'Meditate 10 min',  logs: 26, window: 30, daysSinceLast: 0  },
  { id: 'h2', title: 'Inbox to zero',    logs: 17, window: 30, daysSinceLast: 1  },
  { id: 'h3', title: 'Go for a run',     logs: 7,  window: 30, daysSinceLast: 3  },
  { id: 'h4', title: 'Practice guitar',  logs: 1,  window: 30, daysSinceLast: 16 },
];
