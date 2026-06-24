export type TaskType = 'task' | 'repeated' | 'multistep';

/**
 * Base for all task-like things. id is string|number so top-level DB records
 * (number, auto-increment) and embedded steps (string UUID) can both extend.
 */
export interface SimpleTask {
  id: string | number;
  type: TaskType;
  title: string;
  completedAt: string | null; // YYYY-MM-DD, or null if not complete
  createdAt: string;
  starred: boolean; // add a star icon to the left of the task
  dayNight: boolean; // whether the task should be done during day or night
}

/** Embedded step inside a MultiStepProject. id is a UUID string. */
export interface MultistepTask extends SimpleTask {
  id: string;
  type: 'task';
  deferred: boolean; // main list has non-deferred tasks, secondary list has deferred tasks
}

export interface RepeatedTask extends SimpleTask {
  id: number;
  type: 'repeated';
  resetDay: 'daily' | number; // 0–6
  logMode: 'today' | 'yesterday';
  logs: LogEntry[];
}

export interface MultiStepProject extends SimpleTask {
  id: number;
  type: 'multistep';
  steps: MultistepTask[];
}

export interface LogEntry {
  actionDate: string;   // YYYY-MM-DD — when the button was clicked
  recordedDate: string; // YYYY-MM-DD — today or yesterday per logMode
}

/** A plain top-level task stored directly in IndexedDB. */
export type PlainTask = SimpleTask & { type: 'task'; id: number };

/** Discriminated union of all top-level IndexedDB records. */
export type AnyTask = PlainTask | RepeatedTask | MultiStepProject;
