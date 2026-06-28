export type TaskType = 'task' | 'repeated' | 'multistep';

export const DayNight = { DAY: 'day', NIGHT: 'night' } as const;
export type DayNight = (typeof DayNight)[keyof typeof DayNight];

export const DayNightLabel = {
  DAY:   '☀️ Work/Errand',
  NIGHT: '🌙 Personal',
} as const;

export interface SimpleTask {
  id: string | number;
  type: TaskType;
  title: string;
  completedAt: string | null; // YYYY-MM-DD, or null if not complete
  createdAt: string;
}

/** Embedded step inside a MultiStepProject. id is a UUID string. */
export interface MultistepTask extends SimpleTask {
  id: string;
  type: 'task';
  deferred: boolean;
  starred: boolean;
  dayNight: DayNight;
}

export interface RepeatedTask extends SimpleTask {
  id: number;
  type: 'repeated';
  resetDay: 'daily' | number; // 0–6
  logMode: 'today' | 'yesterday';
  logs: LogEntry[];
  starred: boolean;
  dayNight: DayNight;
}

export interface MultiStepProject extends SimpleTask {
  id: number;
  type: 'multistep';
  deferred: boolean;
  steps: MultistepTask[];
}

export interface LogEntry {
  actionDate: string;   // YYYY-MM-DD — when the button was clicked
  recordedDate: string; // YYYY-MM-DD — today or yesterday per logMode
}

/** A plain top-level task stored directly in IndexedDB. */
export type PlainTask = SimpleTask & { type: 'task'; id: number; starred: boolean; dayNight: DayNight };

/** Discriminated union of all top-level IndexedDB records. */
export type AnyTask = PlainTask | RepeatedTask | MultiStepProject;
