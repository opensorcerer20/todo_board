import {
  useCallback,
  useEffect,
  useState,
} from 'preact/hooks';

import {
  dbAdd,
  dbApplyLogged,
  dbDelete,
  dbGetAll,
  dbUpdateSafe,
} from '../db';
import type { RepeatedTask } from '../types';
import {
  DayNight,
  DayNightLabel,
  ItemType,
} from '../types';
import {
  canLog,
  changedFields,
  habitLoggedEvent,
  makeTask,
  recalcActionDates,
  resetLabel,
  todayStr,
  yesterdayStr,
} from '../utils';
import { DeleteButton } from './DeleteButton';
import { EditButton } from './EditButton';
import { EditModalShell } from './EditModalShell';
import { ErrorBanner } from './ErrorBanner';
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
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(() => dbGetAll(db, ItemType.REPEATED).then(setTasks), [db]);
  useEffect(() => { load(); }, [load]);

  async function addTask(e: Event) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setError(null);
    try {
      await dbAdd(db, makeTask(ItemType.REPEATED, {
        title: t,
        resetDay: resetDay === 'daily' ? 'daily' : parseInt(resetDay, 10),
        logMode,
        logs: [],
        starred,
        dayNight,
      }));
    } catch (err) {
      console.error(err);
      setError("Couldn't add repeat task — please try again.");
      return;
    }
    setTitle('');
    setResetDay('daily');
    setLogMode('today');
    setStarred(false);
    setDayNight(DayNight.NIGHT);
    load();
  }

  async function logTask(task: RepeatedTask) {
    if (!canLog(task)) return;
    setError(null);
    const today    = todayStr();
    const recorded = task.logMode === 'yesterday' ? yesterdayStr() : today;
    const entry    = { actionDate: today, recordedDate: recorded };
    try {
      await dbApplyLogged(
        db,
        task.id,
        (c: RepeatedTask) => ({ ...c, logs: [...c.logs, entry] }),
        (before) => habitLoggedEvent(before, entry),
      );
    } catch (err) {
      console.error(err);
      setError("Couldn't log — please try again.");
      return;
    }
    load();
  }

  async function remove(id: number) {
    setError(null);
    try {
      await dbDelete(db, id);
    } catch (err) {
      console.error(err);
      setError("Couldn't delete repeat task — please try again.");
      return;
    }
    setExpanded(prev => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    load();
  }

  // Throws ConflictError on collision; EditModalShell catches it to show a banner.
  async function saveEdit(patch: Pick<RepeatedTask, 'title' | 'starred' | 'dayNight' | 'resetDay' | 'logMode'>) {
    if (!editing) return;
    // Changing logMode rewrites the whole logs array, so include it in the patch;
    // if another tab appended a log meanwhile, this collides → conflict.
    const full: Partial<RepeatedTask> = { ...patch };
    if (patch.logMode !== editing.logMode) {
      full.logs = recalcActionDates(editing.logs, patch.logMode);
    }
    const edits = changedFields(editing, full);
    if (Object.keys(edits).length === 0) { setEditing(null); return; }
    await dbUpdateSafe(db, editing, edits);
    setEditing(null);
    load();
  }

  function toggleExpand(id: number) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
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
                <EditButton onClick={() => setEditing(task)} />
                <DeleteButton onConfirm={() => remove(task.id)} />
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
          onSaveError={() => setError("Couldn't save — please try again.")}
        />
      )}
    </div>
  );
}

function EditRepeatModal({
  task,
  onSave,
  onClose,
  onSaveError,
}: {
  task: RepeatedTask;
  onSave: (patch: Pick<RepeatedTask, 'title' | 'starred' | 'dayNight' | 'resetDay' | 'logMode'>) => Promise<void>;
  onClose: () => void;
  onSaveError?: (err: unknown) => void;
}) {
  const [title, setTitle]       = useState(task.title);
  const [starred, setStarred]   = useState(task.starred);
  const [dayNight, setDayNight] = useState<DayNight>(task.dayNight ?? DayNight.NIGHT);
  const [resetDay, setResetDay] = useState(String(task.resetDay));
  const [logMode, setLogMode]   = useState<'today' | 'yesterday'>(task.logMode);

  return (
    <EditModalShell
      title="Edit Repeat Task"
      canSubmit={!!title.trim()}
      onClose={onClose}
      onSaveError={onSaveError}
      onSubmit={() => onSave({
        title: title.trim(),
        starred,
        dayNight,
        resetDay: resetDay === 'daily' ? 'daily' : parseInt(resetDay, 10),
        logMode,
      })}
    >
      <div className="form-row" style={{ marginBottom: 16 }}>
        <StarToggle starred={starred} onToggle={() => setStarred(p => !p)} style={{ alignSelf: 'flex-end' }} />
        <TitleInput value={title} onChange={setTitle} />
        <ResetsSelect value={resetDay} onChange={setResetDay} />
        <LogModeSelect value={logMode} onChange={setLogMode} />
        <DayNightSelect value={dayNight} onChange={setDayNight} />
      </div>
    </EditModalShell>
  );
}
