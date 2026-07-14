import type { RepeatedTask } from '../../types';
import { resetLabel } from '../../utils';

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, '0'), String(dt.getDate()).padStart(2, '0')].join('-');
}

export function weekCycleStart(date: string, weekday: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() - weekday + 7) % 7));
  return [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, '0'), String(dt.getDate()).padStart(2, '0')].join('-');
}

export function computeStreak(task: RepeatedTask, today: string): number {
  if (task.logs.length === 0) return 0;

  if (task.resetDay === 'daily') {
    const dates = [...new Set(task.logs.map(l => l.recordedDate))].sort().reverse();
    const anchor = task.logMode === 'today' ? today : addDays(today, -1);
    if (dates[0] !== anchor && dates[0] !== addDays(anchor, -1)) return 0;
    let n = 1;
    for (let i = 1; i < dates.length; i++) {
      if (dates[i] === addDays(dates[i - 1], -1)) n++;
      else break;
    }
    return n;
  }

  const wd = task.resetDay as number;
  const actions = task.logs.map(l => l.actionDate);
  const curStart  = weekCycleStart(today, wd);
  const prevStart = addDays(curStart, -7);
  const inCurrent = actions.some(d => d >= curStart);
  const inPrev    = actions.some(d => d >= prevStart && d < curStart);
  if (!inCurrent && !inPrev) return 0;
  let start = inCurrent ? curStart : prevStart;
  let n = 0;
  for (let i = 0; i < 52; i++) {
    if (!actions.some(d => d >= start && d <= addDays(start, 6))) break;
    n++;
    start = addDays(start, -7);
  }
  return n;
}

export function streakLabel(task: RepeatedTask, streak: number): string {
  if (streak === 0) return resetLabel(task);
  return streak + (task.resetDay === 'daily' ? ' day streak' : ' week streak');
}
