import { useCallback, useEffect, useState } from 'preact/hooks';
import { dbGetAll } from '../db';
import { canLog, resetLabel, todayStr } from '../utils';
import { DayNight } from '../types';
import type { MultiStepProject, PlainTask, RepeatedTask } from '../types';

interface Props { db: IDBDatabase }

type Domain = 'day' | 'night';

const ACCENT = '#7d8cc4';

// ── Style helpers ─────────────────────────────────────────────────────────────

function domainBtnStyle(active: boolean) {
  return {
    border: 'none', cursor: 'pointer', fontFamily: "'Space Mono', monospace",
    fontSize: '13px', fontWeight: 600, padding: '7px 17px', borderRadius: '8px',
    transition: 'all .15s ease',
    background: active ? '#2e333d' : 'transparent',
    color: active ? '#eef0f5' : '#828a9c',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.35)' : 'none',
  } as const;
}

const BOX_BASE = {
  width: '19px', height: '19px', borderRadius: '6px', display: 'flex' as const,
  alignItems: 'center', justifyContent: 'center', fontSize: '12px',
  flexShrink: 0, marginTop: '1px',
};

const CIRCLE_BASE = {
  width: '27px', height: '27px', borderRadius: '50%', display: 'flex' as const,
  alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px',
};

function taskBoxStyle(done: boolean) {
  return done
    ? { ...BOX_BASE, background: ACCENT, border: '1.5px solid ' + ACCENT, color: '#fff' }
    : { ...BOX_BASE, background: 'transparent', border: '1.5px solid #e3e6ee', color: 'transparent' };
}

function taskTitleStyle(done: boolean) {
  return done
    ? { fontSize: '15px', fontWeight: 500, color: '#6a7080', textDecoration: 'line-through' as const }
    : { fontSize: '15px', fontWeight: 500, color: '#e3e6ee' };
}

function habitCircleStyle(done: boolean) {
  return done
    ? { ...CIRCLE_BASE, background: '#5f8f74', color: '#fff', border: '1px solid #5f8f74' }
    : { ...CIRCLE_BASE, background: 'transparent', color: '#e3e6ee', border: '1.5px solid #e3e6ee' };
}

const MONO = "'Space Mono', monospace";

// ── Streak helpers ────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, '0'), String(dt.getDate()).padStart(2, '0')].join('-');
}

function weekCycleStart(date: string, weekday: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() - weekday + 7) % 7));
  return [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, '0'), String(dt.getDate()).padStart(2, '0')].join('-');
}

function computeStreak(task: RepeatedTask, today: string): number {
  if (task.logs.length === 0) return 0;

  if (task.resetDay === 'daily') {
    const dates = [...new Set(task.logs.map(l => l.recordedDate))].sort().reverse();
    // For today-mode: anchor is today; streak alive if last recorded is today or yesterday.
    // For yesterday-mode: anchor is yesterday (today's action records as yesterday);
    //   streak alive if last recorded is yesterday or 2 days ago.
    const anchor = task.logMode === 'today' ? today : addDays(today, -1);
    if (dates[0] !== anchor && dates[0] !== addDays(anchor, -1)) return 0;
    let n = 1;
    for (let i = 1; i < dates.length; i++) {
      if (dates[i] === addDays(dates[i - 1], -1)) n++;
      else break;
    }
    return n;
  }

  // Weekly: streak = consecutive completed cycles going backward from the most recent logged one.
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

function streakLabel(task: RepeatedTask, streak: number): string {
  if (streak === 0) return resetLabel(task);
  return streak + (task.resetDay === 'daily' ? ' day streak' : ' week streak');
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomeTab({ db }: Props) {
  const [tasks,    setTasks]    = useState<PlainTask[]>([]);
  const [repeated, setRepeated] = useState<RepeatedTask[]>([]);
  const [projects, setProjects] = useState<MultiStepProject[]>([]);
  const [domain,   setDomain]   = useState<Domain>('day');

  const load = useCallback(() => Promise.all([
    dbGetAll(db, 'task').then(setTasks),
    dbGetAll(db, 'repeated').then(setRepeated),
    dbGetAll(db, 'multistep').then(setProjects),
  ]), [db]);

  useEffect(() => { load(); }, [load]);

  const today = todayStr();
  const dn    = domain === 'day' ? DayNight.DAY : DayNight.NIGHT;

  // ── Tasks card data ─────────────────────────────────────────────────────────

  // Plain tasks for this domain: incomplete + completed today
  interface TaskItem {
    key: string; title: string; done: boolean; starred: boolean; hasTag: boolean; tag: string; isProject: boolean;
  }

  const plainItems: TaskItem[] = tasks
    .filter(t => (t.dayNight ?? DayNight.NIGHT) === dn && (t.completedAt === null || t.completedAt === today))
    .map(t => ({
      key: 'task-' + t.id,
      title: t.title, done: t.completedAt !== null,
      starred: t.starred, hasTag: false, tag: '', isProject: false,
    }));

  // Only show a project's current step (first incomplete overall) if it matches the domain.
  // Never skip ahead to a later step just because its dayNight matches.
  const activeProjects = projects.filter(p => !p.deferred);

  const stepItems: TaskItem[] = activeProjects.flatMap(p => {
    const step = p.steps.find(s => s.completedAt === null);
    if (!step || (step.dayNight ?? DayNight.NIGHT) !== dn) return [];
    const stepNo = p.steps.indexOf(step) + 1;
    return [{
      key: 'step-' + p.id + '-' + step.id,
      title: step.title, done: false,
      starred: step.starred, hasTag: true,
      tag: p.title + ' · Step ' + stepNo + ' of ' + p.steps.length,
      isProject: true,
    }];
  });

  const allTaskItems = [...plainItems, ...stepItems];
  const pinned = allTaskItems.filter(t => t.starred);
  const other  = allTaskItems.filter(t => !t.starred);
  const doneTasks  = allTaskItems.filter(t => t.done).length;
  const totalTasks = allTaskItems.length;

  // ── Habits card data ────────────────────────────────────────────────────────

  const habits = repeated
    .filter(t => (t.dayNight ?? DayNight.NIGHT) === dn)
    .map(t => ({
      id: t.id, title: t.title,
      doneToday: !canLog(t),
      streakLabel: streakLabel(t, computeStreak(t, today)),
    }));

  const habitsLogged = habits.filter(h => h.doneToday).length;

  // ── Projects card data ──────────────────────────────────────────────────────

  const mappedProjects = activeProjects.map(p => {
    const completedCount = p.steps.filter(s => s.completedAt !== null).length;
    const total = p.steps.length;
    const incomplete = p.steps.filter(s => s.completedAt === null);
    const currentStep = incomplete[0];
    const nextStep    = incomplete[1];
    const stepNo = Math.min(completedCount + 1, total);
    return {
      id: p.id, name: p.title,
      stepLabel: 'Step ' + stepNo + ' of ' + total,
      current: currentStep?.title ?? '(all steps done)',
      currentStarred: currentStep?.starred ?? false,
      next: nextStep?.title ?? '',
      nextStarred: nextStep?.starred ?? false,
      hasNext: !!nextStep,
      barStyle: {
        height: '100%', background: ACCENT, borderRadius: '99px',
        width: Math.round((completedCount / Math.max(total, 1)) * 100) + '%',
      },
    };
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ margin: '0 -16px', background: '#14161b', padding: '28px 28px 64px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", color: '#e3e6ee' }}>

      {/* Day / Night toggle */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '22px', background: '#1c1f27', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        <button style={domainBtnStyle(domain === 'day')}   onClick={() => setDomain('day')}>☀️ Day</button>
        <button style={domainBtnStyle(domain === 'night')} onClick={() => setDomain('night')}>🌙 Night</button>
      </div>

      {/* Board */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '22px', alignItems: 'flex-start' }}>

        {/* LEFT column */}
        <div style={{ flex: '2 1 430px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {/* Tasks card */}
          <div data-testid="tasks-panel" style={{ background: '#1c1f27', border: '1px solid #2a2f3a', borderRadius: '16px', padding: '22px 22px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '.12em', color: '#7a818f', textTransform: 'uppercase' }}>Tasks</div>
              <div style={{ fontFamily: MONO, fontSize: '11px', color: '#6f7686' }}>
                {totalTasks === 0 ? 'nothing here' : doneTasks + ' of ' + totalTasks + ' done'}
              </div>
            </div>

            {totalTasks === 0 ? (
              <div style={{ fontFamily: MONO, fontSize: '12px', color: '#4a5060', padding: '8px 0' }}>No tasks for this period</div>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto', margin: '0 -8px', padding: '0 8px' }}>
                {/* Pinned group */}
                {pinned.length > 0 && (
                  <div style={{ background: '#23201a', border: '1px solid #39331f', borderRadius: '12px', padding: '4px 14px 8px', marginBottom: '12px' }}>
                    <div style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '.12em', color: '#cf9f54', textTransform: 'uppercase', padding: '10px 0 2px' }}>★ Pinned · do first</div>
                    {pinned.map(t => (
                      <div key={t.key} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '11px 0' }}>
                        <div style={taskBoxStyle(t.done)}>{t.done && '✓'}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <span style={{ color: '#d8a85a', fontSize: '13px', lineHeight: '1' }}>★</span>
                            <span style={taskTitleStyle(t.done)}>{t.title}</span>
                          </div>
                          {t.hasTag && (
                            <div style={{ fontFamily: MONO, fontSize: '11px', color: '#7a818f', marginTop: '4px', paddingLeft: '20px' }}>{t.tag}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Other tasks */}
                {other.map(t => (
                  <div key={t.key} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 2px', borderTop: '1px solid #262b34' }}>
                    <div style={taskBoxStyle(t.done)}>{t.done && '✓'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={taskTitleStyle(t.done)}>{t.title}</span>
                      {t.hasTag && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          {t.isProject && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#6f7da5', flexShrink: 0 }}></span>}
                          <span style={{ fontFamily: MONO, fontSize: '11px', color: '#7a818f' }}>{t.tag}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Habits card */}
          <div data-testid="habits-panel" style={{ background: '#1c1f27', border: '1px solid #2a2f3a', borderRadius: '16px', padding: '22px 22px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '.12em', color: '#7a818f', textTransform: 'uppercase' }}>Habits</div>
              <div style={{ fontFamily: MONO, fontSize: '11px', color: '#6f7686' }}>
                {habits.length === 0 ? 'none' : habitsLogged + ' of ' + habits.length + ' logged'}
              </div>
            </div>
            {habits.length === 0 ? (
              <div style={{ fontFamily: MONO, fontSize: '12px', color: '#4a5060', padding: '8px 0 14px' }}>No habits for this period</div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto', margin: '0 -8px', padding: '0 8px' }}>
                {habits.map(h => (
                  <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '11px 0', borderTop: '1px solid #262b34' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', color: '#dfe2ea', fontWeight: 500 }}>{h.title}</div>
                      <div style={{ fontFamily: MONO, fontSize: '11px', color: '#7a818f', marginTop: '3px' }}>{h.streakLabel}</div>
                    </div>
                    <div style={habitCircleStyle(h.doneToday)}>{h.doneToday && '✓'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT column */}
        <div style={{ flex: '1 1 290px', minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {/* Active Projects card */}
          <div style={{ background: '#1c1f27', border: '1px solid #2a2f3a', borderRadius: '16px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '.12em', color: '#7a818f', textTransform: 'uppercase' }}>Active projects</div>
              <div style={{ fontFamily: MONO, fontSize: '11px', color: '#6f7686' }}>{mappedProjects.length} active</div>
            </div>

            {mappedProjects.length === 0 ? (
              <div style={{ fontFamily: MONO, fontSize: '12px', color: '#4a5060', padding: '8px 0' }}>No active projects</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {mappedProjects.map(p => (
                  <div key={p.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#e3e6ee' }}>{p.name}</div>
                      <div style={{ fontFamily: MONO, fontSize: '11px', color: '#7a818f', whiteSpace: 'nowrap' }}>{p.stepLabel}</div>
                    </div>
                    <div style={{ height: '5px', background: '#2a2f3a', borderRadius: '99px', overflow: 'hidden', margin: '10px 0 11px' }}>
                      <div style={p.barStyle}></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#232833', borderRadius: '10px', padding: '10px 12px' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '6px', background: 'transparent', border: '1.5px solid #e3e6ee', flexShrink: 0, marginTop: '1px' }}></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', color: '#e3e6ee', fontWeight: 500 }}>
                          {p.currentStarred && <span style={{ color: '#d8a85a', marginRight: '5px' }}>★</span>}
                          {p.current}
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: '9px', color: '#6f7686', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: '3px' }}>Current step</div>
                      </div>
                    </div>
                    {p.hasNext && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginTop: '8px', paddingLeft: '2px' }}>
                        <span style={{ fontFamily: MONO, fontSize: '9px', color: '#7a818f', textTransform: 'uppercase', letterSpacing: '.08em', flexShrink: 0 }}>On deck</span>
                        <span style={{ fontSize: '12.5px', color: '#838ca2', minWidth: 0 }}>
                          {p.nextStarred && <span style={{ color: '#d8a85a', marginRight: '4px' }}>★</span>}
                          {p.next}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
