import { DayNight, ItemType } from './types';
import type {
  ActivityEvent, AnyTask, LogEntry, PlainTask, RequestTask, RepeatedTask, MultiStepProject, MultistepTask, TaskType,
} from './types';

export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

/**
 * Value equality for record fields. Scalars compare with `===`; nested
 * arrays/objects (e.g. `logs`, `steps`) compare by JSON shape. Order-sensitive
 * by design — a reordered steps/logs array counts as a change.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Returns only the keys of `patch` whose value differs from `original`.
 * Used to write just the fields the user actually changed.
 */
export function changedFields<T extends object>(original: T, patch: Partial<T>): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(patch) as (keyof T)[]) {
    if (!deepEqual(original[key], patch[key])) out[key] = patch[key];
  }
  return out;
}

function localDateStr(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const todayStr = (): string => localDateStr(0);
export const yesterdayStr = (): string => localDateStr(-1);

/** Most recent occurrence of weekday (0=Sun…6=Sat) on or before today. */
export function cycleStartStr(weekday: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() - weekday + 7) % 7));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function canLog(task: RepeatedTask): boolean {
  if (!task.logs || task.logs.length === 0) return true;
  const lastAction = task.logs[task.logs.length - 1].actionDate;
  if (task.resetDay === 'daily') return lastAction !== todayStr();
  return lastAction < cycleStartStr(task.resetDay as number);
}

export function resetLabel(task: RepeatedTask): string {
  return task.resetDay === 'daily' ? 'Daily' : `Every ${DAY_NAMES[task.resetDay as number]}`;
}

export function multistepComplete(project: MultiStepProject): boolean {
  return project.steps.length > 0 && project.steps.every(s => s.completedAt !== null);
}

/** Derived completion date for a fully-completed project: the latest step completedAt. */
export function multistepCompletedAt(project: MultiStepProject): string | null {
  if (!multistepComplete(project)) return null;
  return project.steps.reduce((max, s) => (s.completedAt! > max ? s.completedAt! : max), project.steps[0].completedAt!);
}

// Typed factory — returns the correct Omit<T, 'id'> shape per type.
export function makeTask(type: typeof ItemType.TASK,      overrides?: Partial<Omit<PlainTask,         'id' | 'type'>>): Omit<PlainTask,         'id'>;
export function makeTask(type: typeof ItemType.REQUEST,   overrides?: Partial<Omit<RequestTask,       'id' | 'type'>>): Omit<RequestTask,       'id'>;
export function makeTask(type: typeof ItemType.REPEATED,  overrides?: Partial<Omit<RepeatedTask,      'id' | 'type'>>): Omit<RepeatedTask,      'id'>;
export function makeTask(type: typeof ItemType.MULTISTEP, overrides?: Partial<Omit<MultiStepProject,  'id' | 'type'>>): Omit<MultiStepProject,  'id'>;
export function makeTask(type: TaskType, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { type, title: '', completedAt: null, createdAt: new Date().toISOString(), starred: false, dayNight: DayNight.NIGHT, deferred: false, ...overrides };
}

/** Build a new MultistepTask (step) with a UUID id. */
export function newStep(title = ''): MultistepTask {
  return { id: crypto.randomUUID(), type: ItemType.TASK, title, completedAt: null, createdAt: new Date().toISOString(), starred: false, dayNight: DayNight.NIGHT, deferred: false };
}

// Re-export AnyTask so callers don't need to reach into types directly.
export type { AnyTask };

function addOneDayStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function recalcActionDates(
  logs: LogEntry[],
  newLogMode: 'today' | 'yesterday'
): LogEntry[] {
  return logs.map(log => ({
    ...log,
    actionDate: newLogMode === 'today' ? log.recordedDate : addOneDayStr(log.recordedDate),
  }));
}

/**
 * One-time seed for the append-only activity store: derives the events implied
 * by the current completion state (completed tasks/steps, habit logs). Used only
 * during the v1→v2 upgrade; afterward the store is append-only via dbApplyLogged.
 */
export function activitySeedEvents(tasks: AnyTask[]): Omit<ActivityEvent, 'id'>[] {
  const events: Omit<ActivityEvent, 'id'>[] = [];

  for (const t of tasks) {
    switch (t.type) {
      case ItemType.TASK:
      case ItemType.REQUEST:
        if (t.completedAt) {
          events.push({ at: t.completedAt, kind: t.type, action: 'completed', itemId: t.id, title: t.title });
        }
        break;
      case ItemType.MULTISTEP:
        for (const s of t.steps) {
          if (s.completedAt) {
            events.push({
              at: s.completedAt, kind: ItemType.STEP, action: 'completed',
              itemId: s.id, title: s.title, projectId: t.id, projectTitle: t.title,
            });
          }
        }
        break;
      case ItemType.REPEATED:
        for (const log of t.logs) {
          events.push({
            at: log.actionDate, kind: ItemType.HABIT, action: 'logged',
            itemId: t.id, title: t.title, actionDate: log.actionDate, recordedDate: log.recordedDate,
          });
        }
        break;
      default: {
        // Exhaustiveness guard: a new AnyTask member left unhandled here is a compile error.
        const _exhaustive: never = t;
        void _exhaustive;
      }
    }
  }

  return events.sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * Activity-event factories for the live completion actions (as opposed to
 * activitySeedEvents, which derives history in bulk during the v1→v2 upgrade).
 * Callers pass the pre-mutation record; the factory reads its current
 * completedAt to decide 'completed' vs 'uncompleted' and stamps `at` itself,
 * so dbApplyLogged callers never need to know ActivityEvent's field names.
 */
export function taskCompletionEvent(before: PlainTask | RequestTask): Omit<ActivityEvent, 'id'> {
  return {
    at: new Date().toISOString(),
    kind: before.type,
    action: before.completedAt ? 'uncompleted' : 'completed',
    itemId: before.id,
    title: before.title,
  };
}

export function stepCompletionEvent(project: MultiStepProject, stepId: string): Omit<ActivityEvent, 'id'> {
  const step = project.steps.find(s => s.id === stepId);
  return {
    at: new Date().toISOString(),
    kind: ItemType.STEP,
    action: step?.completedAt ? 'uncompleted' : 'completed',
    itemId: stepId,
    title: step?.title ?? '',
    projectId: project.id,
    projectTitle: project.title,
  };
}

export function habitLoggedEvent(before: RepeatedTask, entry: LogEntry): Omit<ActivityEvent, 'id'> {
  return {
    at: new Date().toISOString(),
    kind: ItemType.HABIT,
    action: 'logged',
    itemId: before.id,
    title: before.title,
    actionDate: entry.actionDate,
    recordedDate: entry.recordedDate,
  };
}
