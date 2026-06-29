import { DayNight } from './types';
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
export function makeTask(type: 'task',      overrides?: Partial<Omit<PlainTask,         'id' | 'type'>>): Omit<PlainTask,         'id'>;
export function makeTask(type: 'request',   overrides?: Partial<Omit<RequestTask,       'id' | 'type'>>): Omit<RequestTask,       'id'>;
export function makeTask(type: 'repeated',  overrides?: Partial<Omit<RepeatedTask,      'id' | 'type'>>): Omit<RepeatedTask,      'id'>;
export function makeTask(type: 'multistep', overrides?: Partial<Omit<MultiStepProject,  'id' | 'type'>>): Omit<MultiStepProject,  'id'>;
export function makeTask(type: TaskType, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { type, title: '', completedAt: null, createdAt: new Date().toISOString(), starred: false, dayNight: DayNight.NIGHT, deferred: false, ...overrides };
}

/** Build a new MultistepTask (step) with a UUID id. */
export function newStep(title = ''): MultistepTask {
  return { id: crypto.randomUUID(), type: 'task', title, completedAt: null, createdAt: new Date().toISOString(), starred: false, dayNight: DayNight.NIGHT, deferred: false };
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
  | { kind: 'task';  id: number;  title: string;  completedAt: string }
  | { kind: 'step';  projectId: number; projectTitle: string; stepTitle: string; completedAt: string }
  | { kind: 'habit'; id: number;  title: string;  logMode: 'today' | 'yesterday'; recordedDate: string; actionDate: string };

export function buildActivityLog(tasks: AnyTask[]): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  for (const t of tasks) {
    if (t.type === 'task' && t.completedAt) {
      entries.push({ kind: 'task', id: t.id as number, title: t.title, completedAt: t.completedAt });
    } else if (t.type === 'multistep') {
      for (const s of t.steps) {
        if (s.completedAt) {
          entries.push({ kind: 'step', projectId: t.id as number, projectTitle: t.title, stepTitle: s.title, completedAt: s.completedAt });
        }
      }
    } else if (t.type === 'repeated') {
      for (const log of t.logs) {
        entries.push({ kind: 'habit', id: t.id as number, title: t.title, logMode: t.logMode, recordedDate: log.recordedDate, actionDate: log.actionDate });
      }
    }
  }

  return entries.sort((a, b) => {
    const dateA = a.kind === 'habit' ? a.recordedDate : a.completedAt;
    const dateB = b.kind === 'habit' ? b.recordedDate : b.completedAt;
    return dateB.localeCompare(dateA);
  });
}
