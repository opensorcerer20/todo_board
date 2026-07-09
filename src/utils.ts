import { DayNight, ItemType } from './types';
import type {
  AnyTask, LogEntry, PlainTask, RequestTask, RepeatedTask, MultiStepProject, MultistepTask, TaskType,
} from './types';

export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

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

export type ActivityEntry =
  | { kind: typeof ItemType.TASK;    id: number;  title: string;  completedAt: string }
  | { kind: typeof ItemType.REQUEST; id: number;  title: string;  completedAt: string }
  | { kind: typeof ItemType.STEP;    projectId: number; projectTitle: string; stepTitle: string; completedAt: string }
  | { kind: typeof ItemType.HABIT;   id: number;  title: string;  logMode: 'today' | 'yesterday'; recordedDate: string; actionDate: string };

export function buildActivityLog(tasks: AnyTask[]): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  for (const t of tasks) {
    switch (t.type) {
      case ItemType.TASK:
        if (t.completedAt) {
          entries.push({ kind: ItemType.TASK, id: t.id, title: t.title, completedAt: t.completedAt });
        }
        break;
      case ItemType.REQUEST:
        if (t.completedAt) {
          entries.push({ kind: ItemType.REQUEST, id: t.id, title: t.title, completedAt: t.completedAt });
        }
        break;
      case ItemType.MULTISTEP:
        for (const s of t.steps) {
          if (s.completedAt) {
            entries.push({ kind: ItemType.STEP, projectId: t.id, projectTitle: t.title, stepTitle: s.title, completedAt: s.completedAt });
          }
        }
        break;
      case ItemType.REPEATED:
        for (const log of t.logs) {
          entries.push({ kind: ItemType.HABIT, id: t.id, title: t.title, logMode: t.logMode, recordedDate: log.recordedDate, actionDate: log.actionDate });
        }
        break;
      default: {
        // Exhaustiveness guard: a new AnyTask member left unhandled here is a compile error.
        const _exhaustive: never = t;
        void _exhaustive;
      }
    }
  }

  return entries.sort((a, b) => {
    const dateA = a.kind === ItemType.HABIT ? a.recordedDate : a.completedAt;
    const dateB = b.kind === ItemType.HABIT ? b.recordedDate : b.completedAt;
    return dateB.localeCompare(dateA);
  });
}
