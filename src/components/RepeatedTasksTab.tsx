import { useState, useEffect, useCallback } from 'preact/hooks';
import { dbGetAll, dbAdd, dbPut, dbDelete } from '../db';
import { canLog, resetLabel, todayStr, yesterdayStr, DAY_NAMES, makeTask } from '../utils';
import { DayNight } from '../types';
import type { RepeatedTask } from '../types';

interface Props { db: IDBDatabase }

export default function RepeatedTasksTab({ db }: Props) {
  const [tasks, setTasks]       = useState<RepeatedTask[]>([]);
  const [title, setTitle]       = useState('');
  const [resetDay, setResetDay] = useState<string>('daily');
  const [logMode, setLogMode]   = useState<'today' | 'yesterday'>('today');
  const [starred, setStarred]   = useState(false);
  const [dayNight, setDayNight] = useState<DayNight>(DayNight.NIGHT);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const load = useCallback(() => dbGetAll(db, 'repeated').then(setTasks), [db]);
  useEffect(() => { load(); }, [load]);

  async function addTask(e: Event) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    await dbAdd(db, makeTask('repeated', {
      title: t,
      resetDay: resetDay === 'daily' ? 'daily' : parseInt(resetDay, 10),
      logMode,
      logs: [],
      starred,
      dayNight,
    }));
    setTitle('');
    setResetDay('daily');
    setLogMode('today');
    setStarred(false);
    setDayNight(DayNight.NIGHT);
    load();
  }

  async function logTask(task: RepeatedTask) {
    if (!canLog(task)) return;
    const today    = todayStr();
    const recorded = task.logMode === 'yesterday' ? yesterdayStr() : today;
    await dbPut(db, { ...task, logs: [...task.logs, { actionDate: today, recordedDate: recorded }] });
    load();
  }

  async function remove(id: number) {
    await dbDelete(db, id);
    load();
  }

  function toggleExpand(id: number) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      <form className="add-form" onSubmit={addTask}>
        <div className="add-form-title">New Repeat Task</div>
        <div className="form-row">
          <button
            type="button"
            className={'btn-star' + (starred ? ' active' : '')}
            onClick={() => setStarred(prev => !prev)}
            title={starred ? 'Starred' : 'Not starred'}
            style={{ alignSelf: 'flex-end' }}
          >
            {starred ? '★' : '☆'}
          </button>
          <div className="form-group grow-2">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onInput={e => setTitle((e.target as HTMLInputElement).value)}
              placeholder="Habit or recurring task…"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Resets</label>
            <select value={resetDay} onChange={e => setResetDay((e.target as HTMLSelectElement).value)}>
              <option value="daily">Daily</option>
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={i}>Every {name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Log date</label>
            <select
              value={logMode}
              onChange={e => setLogMode((e.target as HTMLSelectElement).value as 'today' | 'yesterday')}
            >
              <option value="today">Today's date</option>
              <option value="yesterday">Yesterday's date</option>
            </select>
          </div>

          <div className="form-group">
            <label>Time</label>
            <select
              value={dayNight}
              onChange={e => setDayNight((e.target as HTMLSelectElement).value as DayNight)}
            >
              <option value="day">☀️ Day</option>
              <option value="night">🌙 Night</option>
            </select>
          </div>

          <button className="btn btn-primary" type="submit" style={{ alignSelf: 'flex-end' }}>
            Add
          </button>
        </div>
      </form>

      {tasks.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔁</div>
          <p>No repeat tasks yet — add one above.</p>
        </div>
      )}

      <div className="task-list">
        {tasks.map(task => {
          const eligible = canLog(task);
          const isOpen   = !!expanded[task.id];
          const logCount = task.logs.length;

          return (
            <div className="task-card" key={task.id}>
              <div className="task-card-header">
                <span className="task-title">{task.title}</span>
                <button
                  className="btn btn-log"
                  onClick={() => logTask(task)}
                  disabled={!eligible}
                  title={eligible ? 'Log this task' : 'Already logged this cycle'}
                >
                  {eligible ? 'Log ✓' : 'Logged'}
                </button>
                <button className="btn-icon" title="Delete" onClick={() => remove(task.id)}>×</button>
              </div>

              <div className="task-meta-row">
                <span className="badge badge-purple">{resetLabel(task)}</span>
                <span className="badge badge-gray">
                  {task.logMode === 'yesterday' ? '📅 Logs yesterday' : '📅 Logs today'}
                </span>
                <span className="badge badge-gray">{task.dayNight === DayNight.NIGHT ? '🌙 Night' : '☀️ Day'}</span>
                {task.starred && <span className="badge badge-amber">★ Starred</span>}
                {logCount > 0 && (
                  <span className={`badge ${eligible ? 'badge-gray' : 'badge-green'}`}>
                    {logCount} {logCount === 1 ? 'log' : 'logs'}
                  </span>
                )}
                {!eligible && <span className="badge badge-amber">Next cycle pending</span>}
              </div>

              {logCount > 0 && (
                <div className="log-section">
                  <button className="log-toggle" onClick={() => toggleExpand(task.id)}>
                    <span>{isOpen ? '▾' : '▸'}</span>
                    {isOpen ? 'Hide history' : 'Show history'}
                  </button>
                  {isOpen && (
                    <div className="log-dates">
                      {[...task.logs].reverse().map((entry, i) => (
                        <span className="log-chip" key={i}>{entry.recordedDate}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
