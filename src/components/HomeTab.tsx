import { useState } from 'preact/hooks';

interface Props { db: IDBDatabase }

type Domain = 'day' | 'night';

const ACCENT = '#7d8cc4';

// ── Static placeholder data ───────────────────────────────────────────────────

interface RawTask { title: string; starred?: boolean; tag?: string; isProject?: boolean; done?: boolean }
interface RawHabit { title: string; streak: number; isAvoid: boolean; doneToday?: boolean; status?: string }
interface RawProject { name: string; stepNo: number; total: number; current: string; next?: string }

const DATA: Record<Domain, { tasks: RawTask[]; habits: RawHabit[]; projects: RawProject[] }> = {
  day: {
    tasks: [
      { title: 'Send Q3 budget to Mara', starred: true, tag: 'Due 4pm' },
      { title: 'Reply to vendor contract email', starred: true },
      { title: 'Finalize homepage copy', tag: 'Website redesign · Step 4 of 9', isProject: true },
      { title: 'Schedule onsite interview loops', tag: 'Hiring: Designer · Step 2 of 5', isProject: true },
      { title: 'Pick up printed banners', tag: 'Errand' },
      { title: 'Book flights for the offsite' },
      { title: 'Review PR #482', done: true },
    ],
    habits: [
      { title: 'Inbox to zero', streak: 8, isAvoid: false, doneToday: true },
      { title: 'No Slack before 10am', streak: 12, isAvoid: true, status: 'clean' },
    ],
    projects: [
      { name: 'Website redesign', stepNo: 4, total: 9, current: 'Finalize homepage copy', next: 'Dev handoff for header' },
      { name: 'Hiring: Designer', stepNo: 2, total: 5, current: 'Schedule onsite loops', next: 'Send debrief survey' },
    ],
  },
  night: {
    tasks: [
      { title: 'Call Mom', starred: true },
      { title: 'Finish Unit 3 grammar', tag: 'Learn Spanish · Step 3 of 12', isProject: true },
      { title: 'Get 3 contractor quotes', tag: 'Kitchen reno · Step 1 of 7', isProject: true },
      { title: 'Renew passport', tag: 'Errand' },
      { title: 'Return Amazon package', tag: 'Errand' },
      { title: 'Buy running shoes' },
    ],
    habits: [
      { title: 'Meditate 10 min', streak: 23, isAvoid: false, doneToday: true },
      { title: 'Read before bed', streak: 5, isAvoid: false, doneToday: false },
      { title: 'No phone in bed', streak: 4, isAvoid: true, status: 'clean' },
      { title: 'No sugar', streak: 0, isAvoid: true, status: 'logged' },
    ],
    projects: [
      { name: 'Learn Spanish', stepNo: 3, total: 12, current: 'Finish Unit 3 grammar', next: 'Start Unit 4 vocab' },
      { name: 'Kitchen renovation', stepNo: 1, total: 7, current: 'Get 3 contractor quotes', next: 'Compare bids & pick' },
    ],
  },
};

// ── Style helpers (adapted from design DCLogic) ───────────────────────────────

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

const PILL_BASE = {
  fontFamily: "'Space Mono', monospace", fontSize: '11px',
  padding: '5px 11px', borderRadius: '99px', whiteSpace: 'nowrap' as const, fontWeight: 700,
};

const CIRCLE_BASE = {
  width: '27px', height: '27px', borderRadius: '50%', display: 'flex' as const,
  alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px',
};

function mapTask(t: RawTask) {
  const done = !!t.done;
  return {
    title: t.title, done, starred: !!t.starred,
    isProject: !!t.isProject, hasTag: !!t.tag, tag: t.tag ?? '',
    boxStyle: done
      ? { ...BOX_BASE, background: ACCENT, border: '1.5px solid ' + ACCENT, color: '#fff' }
      : { ...BOX_BASE, background: 'transparent', border: '1.5px solid #e3e6ee', color: 'transparent' },
    titleStyle: done
      ? { fontSize: '15px', fontWeight: 500, color: '#6a7080', textDecoration: 'line-through' as const }
      : { fontSize: '15px', fontWeight: 500, color: '#e3e6ee' },
  };
}

function mapHabit(h: RawHabit) {
  if (h.isAvoid) {
    const logged = h.status === 'logged';
    return {
      title: h.title, isAvoid: true, isBuild: false, doneToday: false,
      streakLabel: logged ? 'Streak reset' : h.streak + ' days clean',
      pillStyle: logged
        ? { ...PILL_BASE, background: '#2c2620', color: '#cf9f54' }
        : { ...PILL_BASE, background: '#1d2a22', color: '#7fb295' },
      pillText: logged ? 'Logged yesterday' : 'Clean today',
      loggedToday: !logged, circleStyle: CIRCLE_BASE,
    };
  }
  return {
    title: h.title, isAvoid: false, isBuild: true,
    streakLabel: h.streak + ' day streak',
    doneToday: !!h.doneToday, loggedToday: !!h.doneToday,
    circleStyle: h.doneToday
      ? { ...CIRCLE_BASE, background: '#5f8f74', color: '#fff', border: '1px solid #5f8f74' }
      : { ...CIRCLE_BASE, background: 'transparent', color: '#e3e6ee', border: '1.5px solid #e3e6ee' },
    pillStyle: PILL_BASE, pillText: '',
  };
}

function mapProject(p: RawProject) {
  return {
    name: p.name, current: p.current, next: p.next ?? '',
    stepLabel: 'Step ' + p.stepNo + ' of ' + p.total,
    hasNext: !!p.next && p.stepNo < p.total,
    boxStyle: {
      width: '18px', height: '18px', borderRadius: '6px', display: 'flex' as const,
      background: 'transparent', border: '1.5px solid #e3e6ee', flexShrink: 0, marginTop: '1px',
    },
    barStyle: {
      height: '100%', background: ACCENT, borderRadius: '99px',
      width: Math.round((p.stepNo / p.total) * 100) + '%',
    },
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function HomeTab({ db: _db }: Props) {
  const [domain, setDomain] = useState<Domain>('day');

  const src = DATA[domain];
  const allTasks   = src.tasks.map(t => mapTask(t));
  const totalTasks = allTasks.length;
  const doneTasks  = allTasks.filter(t => t.done).length;
  const pinned     = allTasks.filter(t => t.starred);
  const other      = allTasks.filter(t => !t.starred);
  const habits     = src.habits.map(h => mapHabit(h));
  const projects   = src.projects.map(p => mapProject(p));

  const habitsLogged = habits.filter(h => h.loggedToday).length;

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
          <div style={{ background: '#1c1f27', border: '1px solid #2a2f3a', borderRadius: '16px', padding: '22px 22px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', letterSpacing: '.12em', color: '#7a818f', textTransform: 'uppercase' }}>Tasks</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#6f7686' }}>{doneTasks} of {totalTasks} completed</div>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', margin: '0 -8px', padding: '0 8px' }}>
              {/* Pinned group */}
              {pinned.length > 0 && (
                <div style={{ background: '#23201a', border: '1px solid #39331f', borderRadius: '12px', padding: '4px 14px 8px', marginBottom: '12px' }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', letterSpacing: '.12em', color: '#cf9f54', textTransform: 'uppercase', padding: '10px 0 2px' }}>★ Pinned · do first</div>
                  {pinned.map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '11px 0' }}>
                      <div style={t.boxStyle}>{t.done && '✓'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <span style={{ color: '#d8a85a', fontSize: '13px', lineHeight: '1' }}>★</span>
                          <span style={t.titleStyle}>{t.title}</span>
                        </div>
                        {t.hasTag && (
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#7a818f', marginTop: '4px', paddingLeft: '20px' }}>{t.tag}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Other tasks */}
              {other.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 2px', borderTop: '1px solid #262b34' }}>
                  <div style={t.boxStyle}>{t.done && '✓'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={t.titleStyle}>{t.title}</span>
                    {t.hasTag && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        {t.isProject && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#6f7da5', flexShrink: 0 }}></span>}
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#7a818f' }}>{t.tag}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Habits card */}
          <div style={{ background: '#1c1f27', border: '1px solid #2a2f3a', borderRadius: '16px', padding: '22px 22px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', letterSpacing: '.12em', color: '#7a818f', textTransform: 'uppercase' }}>Habits</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#6f7686' }}>{habitsLogged} of {habits.length} logged</div>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto', margin: '0 -8px', padding: '0 8px' }}>
              {habits.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '11px 0', borderTop: '1px solid #262b34' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', color: '#dfe2ea', fontWeight: 500 }}>{h.title}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#7a818f', marginTop: '3px' }}>{h.streakLabel}</div>
                  </div>
                  {h.isAvoid && <div style={h.pillStyle}>{h.pillText}</div>}
                  {h.isBuild && <div style={h.circleStyle}>{h.doneToday && '✓'}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div style={{ flex: '1 1 290px', minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {/* Active Projects card */}
          <div style={{ background: '#1c1f27', border: '1px solid #2a2f3a', borderRadius: '16px', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', letterSpacing: '.12em', color: '#7a818f', textTransform: 'uppercase' }}>Active projects</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#6f7686' }}>{projects.length} / 2 active</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {projects.map((p, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#e3e6ee' }}>{p.name}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#7a818f', whiteSpace: 'nowrap' }}>{p.stepLabel}</div>
                  </div>
                  <div style={{ height: '5px', background: '#2a2f3a', borderRadius: '99px', overflow: 'hidden', margin: '10px 0 11px' }}>
                    <div style={p.barStyle}></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#232833', borderRadius: '10px', padding: '10px 12px' }}>
                    <div style={p.boxStyle}></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', color: '#e3e6ee', fontWeight: 500 }}>{p.current}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#6f7686', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: '3px' }}>Current step</div>
                    </div>
                  </div>
                  {p.hasNext && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginTop: '8px', paddingLeft: '2px' }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: '#7a818f', textTransform: 'uppercase', letterSpacing: '.08em', flexShrink: 0 }}>On deck</span>
                      <span style={{ fontSize: '12.5px', color: '#838ca2', minWidth: 0 }}>{p.next}</span>
                    </div>
                  )}
                </div>
              ))}
              <div style={{ border: '1px dashed #353b47', borderRadius: '11px', padding: '11px', textAlign: 'center', color: '#6f7686', fontFamily: "'Space Mono', monospace", fontSize: '11px', lineHeight: 1.5 }}>
                Limit reached — finish one<br />to start another
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
