export const STALE_DAYS = 14;
export const FREQUENT_RATIO = 0.7;
export const OFTEN_RATIO = 0.4;

export interface HabitHealthInput {
  logs: number;
  window?: number;
  daysSinceLast?: number;
}

export interface HabitHealth {
  key: 'frequent' | 'often' | 'rarely' | 'stale';
  label: string;
  level: number;
}

export function habitHealth({ logs, window = 30, daysSinceLast }: HabitHealthInput): HabitHealth {
  if (daysSinceLast != null && daysSinceLast >= STALE_DAYS) {
    return { key: 'stale', label: 'Stale', level: 0 };
  }
  const ratio = window > 0 ? logs / window : 0;
  if (ratio >= FREQUENT_RATIO) return { key: 'frequent', label: 'Frequent', level: 4 };
  if (ratio >= OFTEN_RATIO)    return { key: 'often',    label: 'Often',    level: 3 };
  return { key: 'rarely', label: 'Rarely', level: 2 };
}

export function habitDetail(h: { logs: number; window?: number; daysSinceLast?: number }, health: HabitHealth): string {
  if (health.key === 'stale') {
    const d = h.daysSinceLast;
    return (d != null && Number.isFinite(d)) ? `No log in ${d} days` : 'Never logged';
  }
  return `${h.logs} ${h.logs === 1 ? 'log' : 'logs'} in ${h.window ?? 30} days`;
}
