/**
 * Central source of truth for every item-type string used in the app.
 *
 * Two axes share this vocabulary:
 *   • stored `type` discriminant — TASK, REQUEST, REPEATED, MULTISTEP
 *   • activity-log `kind`        — TASK, STEP, HABIT (see ActivityEntry in utils.ts)
 */
export const ItemType = {
  TASK:      'task',
  REQUEST:   'request',
  REPEATED:  'repeated',
  MULTISTEP: 'multistep',
  STEP:      'step',
  HABIT:     'habit',
} as const;

/** The `type` discriminant stored on every top-level IndexedDB record. */
export type TaskType =
  | typeof ItemType.TASK
  | typeof ItemType.REQUEST
  | typeof ItemType.REPEATED
  | typeof ItemType.MULTISTEP;

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
  type: typeof ItemType.TASK;
  deferred: boolean;
  starred: boolean;
  dayNight: DayNight;
}

export interface RepeatedTask extends SimpleTask {
  id: number;
  type: typeof ItemType.REPEATED;
  resetDay: 'daily' | number; // 0–6
  logMode: 'today' | 'yesterday';
  logs: LogEntry[];
  starred: boolean;
  dayNight: DayNight;
}

export interface MultiStepProject extends SimpleTask {
  id: number;
  type: typeof ItemType.MULTISTEP;
  deferred: boolean;
  steps: MultistepTask[];
}

export interface LogEntry {
  actionDate: string;   // YYYY-MM-DD — when the button was clicked
  recordedDate: string; // YYYY-MM-DD — today or yesterday per logMode
}

/** A plain top-level task stored directly in IndexedDB. */
export type PlainTask = SimpleTask & { type: typeof ItemType.TASK; id: number; starred: boolean; dayNight: DayNight };

/** A request / ask stored directly in IndexedDB. */
export type RequestTask = SimpleTask & { type: typeof ItemType.REQUEST; id: number; starred: boolean; dayNight: DayNight };

/** Discriminated union of all top-level IndexedDB records. */
export type AnyTask = PlainTask | RequestTask | RepeatedTask | MultiStepProject;

/**
 * An entry in the append-only activity log (the `activity` object store).
 * Events are only ever appended — never updated or deleted — so `title` is a
 * snapshot taken at the moment of the action, immune to later renames/deletes.
 */
export type ActivityAction = 'completed' | 'uncompleted' | 'logged';

export interface ActivityEvent {
  id: number;                 // autoIncrement key
  at: string;                 // ISO timestamp of the action (YYYY-MM-DD for seeded history)
  kind:
    | typeof ItemType.TASK
    | typeof ItemType.REQUEST
    | typeof ItemType.STEP
    | typeof ItemType.HABIT;
  action: ActivityAction;
  itemId: number | string;    // step events use the step's UUID
  title: string;
  projectId?: number;         // step events
  projectTitle?: string;      // step events
  actionDate?: string;        // habit logs
  recordedDate?: string;      // habit logs
}
