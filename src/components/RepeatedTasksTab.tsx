import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { dbGetAll, dbAdd, dbPut, dbDelete } from '../db';
import { canLog, recalcActionDates, resetLabel, todayStr, yesterdayStr, makeTask } from '../utils';
import { DayNight, DayNightLabel } from '../types';
import type { RepeatedTask } from '../types';
import {
  DayNightSelect,
  LogModeSelect,
  ResetsSelect,
  StarToggle,
  TitleInput,
} from './fields';

interface Props { db: IDBDatabase }

export default function RepeatedTasksTab({ db }: Props) {
  const [tasks, setTasks]       = useState<RepeatedTask[]>([]);
  const [title, setTitle]       = useState('');
  const [resetDay, setResetDay] = useState<string>('daily');
  const [logMode, setLogMode]   = useState<'today' | 'yesterday'>('today');
  const [starred, setStarred]   = useState(false);
  const [dayNight, setDayNight] = useState<DayNight>(DayNight.NIGHT);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [editing, setEditing]   = useState<RepeatedTask | null>(null);

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

  async function saveEdit(patch: Pick<RepeatedTask, 'title' | 'starred' | 'dayNight' | 'resetDay' | 'logMode'>) {
    if (!editing) return;
    const logs = patch.logMode !== editing.logMode
      ? recalcActionDates(editing.logs, patch.logMode)
      : editing.logs;
    await dbPut(db, { ...editing, ...patch, logs });
    setEditing(null);
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
          <StarToggle starred={starred} onToggle={() => setStarred(p => !p)} style={{ alignSelf: 'flex-end' }} />
          <TitleInput value={title} onChange={setTitle} placeholder="Habit or recurring task…" autoFocus />
          <ResetsSelect value={resetDay} onChange={setResetDay} />
          <LogModeSelect value={logMode} onChange={setLogMode} />
          <DayNightSelect value={dayNight} onChange={setDayNight} />
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
                <button className="btn-icon btn-edit" title="Edit" onClick={() => setEditing(task)}>🖌</button>
                <button className="btn-icon" title="Delete" onClick={() => remove(task.id)}>×</button>
              </div>

              <div className="task-meta-row">
                <span className="badge badge-purple">{resetLabel(task)}</span>
                <span className="badge badge-gray">
                  {task.logMode === 'yesterday' ? '📅 Logs yesterday' : '📅 Logs today'}
                </span>
                <span className="badge badge-gray">{task.dayNight === DayNight.NIGHT ? DayNightLabel.NIGHT : DayNightLabel.DAY}</span>
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

      {editing && (
        <EditRepeatModal
          task={editing}
          onSave={saveEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function EditRepeatModal({
  task,
  onSave,
  onClose,
}: {
  task: RepeatedTask;
  onSave: (patch: Pick<RepeatedTask, 'title' | 'starred' | 'dayNight' | 'resetDay' | 'logMode'>) => void;
  onClose: () => void;
}) {
  const [title, setTitle]       = useState(task.title);
  const [starred, setStarred]   = useState(task.starred);
  const [dayNight, setDayNight] = useState<DayNight>(task.dayNight ?? DayNight.NIGHT);
  const [resetDay, setResetDay] = useState(String(task.resetDay));
  const [logMode, setLogMode]   = useState<'today' | 'yesterday'>(task.logMode);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function submit(e: Event) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onSave({
      title: t,
      starred,
      dayNight,
      resetDay: resetDay === 'daily' ? 'daily' : parseInt(resetDay, 10),
      logMode,
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Edit Repeat Task</span>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-row" style={{ marginBottom: 16 }}>
            <StarToggle starred={starred} onToggle={() => setStarred(p => !p)} style={{ alignSelf: 'flex-end' }} />
            <TitleInput value={title} onChange={setTitle} inputRef={inputRef} />
            <ResetsSelect value={resetDay} onChange={setResetDay} />
            <LogModeSelect value={logMode} onChange={setLogMode} />
            <DayNightSelect value={dayNight} onChange={setDayNight} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose} style={{ background: 'var(--bg)', color: 'var(--text)' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
