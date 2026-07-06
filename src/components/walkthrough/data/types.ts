import type { Item } from '../lib/sorting';

export interface Habit {
  id: string | number;
  title: string;
  logs: number;
  window: number;
  daysSinceLast: number;
}

export interface DayDataAdapter {
  getItems(): Promise<Item[]>;
  getHabits(): Promise<Habit[]>;
  addItem(input: Partial<Item>): Promise<Item>;
  setDone(id: string | number, done: boolean): Promise<void>;
  deferItem(id: string | number): Promise<void>;
  logProgress(id: string | number, note?: string): Promise<void>;
  logHabit(id: string | number): Promise<void>;
  subscribe?(cb: () => void): () => void;
}
