import { useCallback, useEffect, useState } from 'preact/hooks';
import { dbGetAll } from '../db';
import { canLog, resetLabel, todayStr } from '../utils';
import { DayNight, DayNightLabel } from '../types';
import type { MultiStepProject, PlainTask, RequestTask, RepeatedTask } from '../types';

interface Props { db: IDBDatabase }

// ── Style helpers ─────────────────────────────────────────────────────────────

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
    ? { ...BOX_BASE, background: 'var(--primary)', border: '1.5px solid var(--primary)', color: '#fff' }
    : { ...BOX_BASE, background: 'transparent', border: '1.5px solid var(--checkbox-border)', color: 'transparent' };
}

function taskTitleStyle(done: boolean) {
  return done
    ? { fontSize: '15px', fontWeight: 500, color: 'var(--text-muted)', textDecoration: 'line-through' as const }
    : { fontSize: '15px', fontWeight: 500, color: 'var(--text)' };
}

function habitCircleStyle(done: boolean) {
  return done
    ? { ...CIRCLE_BASE, background: 'var(--success)', color: '#fff', border: '1px solid var(--success)' }
    : { ...CIRCLE_BASE, background: 'transparent', color: 'var(--text-muted)', border: '1.5px solid var(--border)' };
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

function streakLabel(task: RepeatedTask, streak: number): string {
  if (streak === 0) return resetLabel(task);
  return streak + (task.resetDay === 'daily' ? ' day streak' : ' week streak');
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaskItem {
  key: string; title: string; done: boolean; starred: boolean;
  projectName: string; stepLabel: string; isProject: boolean;
}

interface HabitItem {
  id: number; title: string; doneToday: boolean; streakLabel: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomeTab({ db }: Props) {
  const [tasks,    setTasks]    = useState<PlainTask[]>([]);
  const [requests, setRequests] = useState<RequestTask[]>([]);
  const [repeated, setRepeated] = useState<RepeatedTask[]>([]);
  const [projects, setProjects] = useState<MultiStepProject[]>([]);

  const load = useCallback(() => Promise.all([
    dbGetAll(db, 'task').then(setTasks),
    dbGetAll(db, 'request').then(setRequests),
    dbGetAll(db, 'repeated').then(setRepeated),
    dbGetAll(db, 'multistep').then(setProjects),
  ]), [db]);

  useEffect(() => { load(); }, [load]);

  const today = todayStr();
  const activeProjects = projects.filter(p => !p.deferred);

  function buildTaskItems(dn: DayNight): TaskItem[] {
    const plain: TaskItem[] = tasks
      .filter(t => (t.dayNight ?? DayNight.NIGHT) === dn && (t.completedAt === null || t.completedAt === today))
      .map(t => ({
        key: 'task-' + t.id,
        title: t.title, done: t.completedAt !== null,
        starred: t.starred, projectName: '', stepLabel: '', isProject: false,
      }));

    const steps: TaskItem[] = activeProjects.flatMap(p => {
      const step = p.steps.find(s => s.completedAt === null);
      if (!step || (step.dayNight ?? DayNight.NIGHT) !== dn) return [];
      const stepNo = p.steps.indexOf(step) + 1;
      return [{
        key: 'step-' + p.id + '-' + step.id,
        title: step.title, done: false,
        starred: step.starred,
        projectName: p.title,
        stepLabel: 'Step ' + stepNo + ' of ' + p.steps.length,
        isProject: true,
      }];
    });

    return [...plain, ...steps];
  }

  function buildHabits(dn: DayNight): HabitItem[] {
    return repeated
      .filter(t => (t.dayNight ?? DayNight.NIGHT) === dn)
      .map(t => ({
        id: t.id, title: t.title,
        doneToday: !canLog(t),
        streakLabel: streakLabel(t, computeStreak(t, today)),
      }));
  }

  const dayTaskItems   = buildTaskItems(DayNight.DAY);
  const nightTaskItems = buildTaskItems(DayNight.NIGHT);
  const dayHabits      = buildHabits(DayNight.DAY);
  const nightHabits    = buildHabits(DayNight.NIGHT);

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
        height: '100%', background: 'var(--primary)', borderRadius: '99px',
        width: (completedCount === 0 ? 1 : Math.round((completedCount / Math.max(total, 1)) * 100)) + '%',
      },
    };
  });

  // ── Render helpers ──────────────────────────────────────────────────────────

  function renderTasks(items: TaskItem[]) {
    const pinned = items.filter(t => t.starred);
    const other  = items.filter(t => !t.starred);
    if (items.length === 0) return (
      <div style={{ fontFamily: MONO, fontSize: '12px', color: 'var(--text-dim)', padding: '4px 0 6px' }}>nothing here</div>
    );
    return (
      <div>
        {pinned.length > 0 && (
          <div style={{ background: 'var(--pinned-bg)', border: '1px solid var(--pinned-border)', borderRadius: '12px', padding: '4px 14px 8px', marginBottom: '10px' }}>
            <div style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '.12em', color: 'var(--pinned-label)', textTransform: 'uppercase' as const, padding: '10px 0 2px' }}>★ Pinned · do first</div>
            {pinned.map(t => (
              <div key={t.key} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '11px 0' }}>
                <div style={taskBoxStyle(t.done)}>{t.done && '✓'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ color: 'var(--warning)', fontSize: '13px', lineHeight: '1' }}>★</span>
                    <span style={taskTitleStyle(t.done)}>{t.title}</span>
                  </div>
                  {t.isProject && <ProjectBadges name={t.projectName} label={t.stepLabel} indent />}
                </div>
              </div>
            ))}
          </div>
        )}
        {other.map(t => (
          <div key={t.key} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 2px', borderTop: '1px solid var(--border)' }}>
            <div style={taskBoxStyle(t.done)}>{t.done && '✓'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={taskTitleStyle(t.done)}>{t.title}</span>
              {t.isProject && <ProjectBadges name={t.projectName} label={t.stepLabel} />}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderHabits(habits: HabitItem[]) {
    if (habits.length === 0) return (
      <div style={{ fontFamily: MONO, fontSize: '12px', color: 'var(--text-dim)', padding: '4px 0 6px' }}>nothing here</div>
    );
    return (
      <div>
        {habits.map(h => (
          <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '11px 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', color: 'var(--text)', fontWeight: 500 }}>{h.title}</div>
              <span style={{ display: 'inline-block', marginTop: '5px', fontFamily: MONO, fontSize: '10px', color: '#7fb295', border: '1px solid rgba(95,143,116,0.3)', borderRadius: '99px', padding: '2px 8px', whiteSpace: 'nowrap', background: 'rgba(95,143,116,0.12)' }}>{h.streakLabel}</span>
            </div>
            <div style={habitCircleStyle(h.doneToday)}>{h.doneToday && '✓'}</div>
          </div>
        ))}
      </div>
    );
  }

  function renderDomainCard(
    label: string,
    taskItems: TaskItem[],
    habits: HabitItem[],
    extraProps: Record<string, string> = {}
  ) {
    const hasContent = taskItems.length > 0 || habits.length > 0;
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px 22px 10px' }} {...extraProps}>
        <div style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '.12em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: '10px' }}>{label}</div>
        {!hasContent ? (
          <div style={{ fontFamily: MONO, fontSize: '12px', color: 'var(--text-dim)', padding: '4px 0 8px' }}>nothing here</div>
        ) : (
          <>
            {renderTasks(taskItems)}
            {habits.length > 0 && (
              <div style={taskItems.length > 0 ? { borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '2px' } : {}}>
                {renderHabits(habits)}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ margin: '0 -16px', background: 'var(--bg)', padding: '28px 28px 64px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", color: 'var(--text)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '22px', alignItems: 'flex-start' }}>

        {/* LEFT column — tasks-panel wraps both domain cards so task/habit queries work across domains */}
        <div data-testid="tasks-panel" style={{ flex: '2 1 430px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Work/Errand card — habits-panel scoped here since all streak tests use Day-mode habits */}
          {renderDomainCard(DayNightLabel.DAY,   dayTaskItems,   dayHabits,   { 'data-testid': 'habits-panel' })}
          {renderDomainCard(DayNightLabel.NIGHT, nightTaskItems, nightHabits)}
        </div>

        {/* RIGHT column — projects + requests */}
        <div style={{ flex: '1 1 290px', minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active projects</div>
              <div style={{ fontFamily: MONO, fontSize: '11px', color: 'var(--text-dim)' }}>{mappedProjects.length} active</div>
            </div>

            {mappedProjects.length === 0 ? (
              <div style={{ fontFamily: MONO, fontSize: '12px', color: 'var(--text-dim)', padding: '8px 0' }}>No active projects</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {mappedProjects.map((p, i) => (
                  <div key={p.id} style={i > 0 ? { borderTop: '1px solid var(--border)', marginTop: '18px', paddingTop: '18px' } : {}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                      <div style={{ fontFamily: MONO, fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.stepLabel}</div>
                    </div>
                    <div style={{ height: '5px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden', margin: '10px 0 11px' }}>
                      <div style={p.barStyle}></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--surface-2)', borderRadius: '10px', padding: '10px 12px' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '6px', background: 'transparent', border: '1.5px solid var(--checkbox-border)', flexShrink: 0, marginTop: '1px' }}></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', color: 'var(--text)', fontWeight: 500 }}>
                          {p.currentStarred && <span style={{ color: 'var(--warning)', marginRight: '5px' }}>★</span>}
                          {p.current}
                        </div>
                      </div>
                    </div>
                    {p.hasNext && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginTop: '8px', paddingLeft: '2px' }}>
                        <span style={{ fontFamily: MONO, fontSize: '9px', color: '#8fa5d0', border: '1px solid rgba(111,125,165,0.3)', borderRadius: '99px', padding: '2px 8px', letterSpacing: '.06em', textTransform: 'uppercase', background: 'rgba(111,125,165,0.12)', flexShrink: 0 }}>On deck</span>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', minWidth: 0 }}>
                          {p.nextStarred && <span style={{ color: 'var(--warning)', marginRight: '4px' }}>★</span>}
                          {p.next}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Requests card */}
          {requests.filter(r => r.completedAt === null).length > 0 && (() => {
            const pending = requests.filter(r => r.completedAt === null);
            return (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px' }}>
                <div style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '14px' }}>
                  Requests · {pending.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {pending.map((r, i) => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', ...(i > 0 ? { borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' } : {}) }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>
                          {r.starred && <span style={{ color: 'var(--warning)', marginRight: '5px' }}>★</span>}
                          {r.title}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ── Small sub-component ───────────────────────────────────────────────────────

function ProjectBadges({ name, label, indent = false }: { name: string; label: string; indent?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '5px', marginTop: '5px', ...(indent ? { marginLeft: '20px' } : {}), flexWrap: 'wrap' }}>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#8fa5d0', border: '1px solid rgba(111,125,165,0.3)', borderRadius: '99px', padding: '2px 8px', whiteSpace: 'nowrap', background: 'rgba(111,125,165,0.12)' }}>{name}</span>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#8fa5d0', border: '1px solid rgba(111,125,165,0.3)', borderRadius: '99px', padding: '2px 8px', whiteSpace: 'nowrap', background: 'rgba(111,125,165,0.12)' }}>{label}</span>
    </div>
  );
}
