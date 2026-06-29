import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'preact/hooks';

import {
  dbAdd,
  dbDelete,
  dbGetAll,
  dbPut,
} from '../db';
import type { PlainTask, RequestTask } from '../types';
import { DayNight, DayNightLabel } from '../types';
import {
  DayNightSelect,
  StarToggle,
  TitleInput,
} from './fields';
import { DeleteButton } from './DeleteButton';
import {
  makeTask,
  todayStr,
  yesterdayStr,
} from '../utils';

type EditableTask = PlainTask | RequestTask;

interface Props { db: IDBDatabase }

export default function TasksTab({ db }: Props) {
  const [tasks,     setTasks]     = useState<PlainTask[]>([]);
  const [requests,  setRequests]  = useState<RequestTask[]>([]);
  const [title,     setTitle]     = useState('');
  const [starred,   setStarred]   = useState(false);
  const [dayNight,  setDayNight]  = useState<typeof DayNight[keyof typeof DayNight]>(DayNight.NIGHT);
  const [taskKind,  setTaskKind]  = useState<'task' | 'request'>('task');
  const [editing,   setEditing]   = useState<EditableTask | null>(null);

  const load = useCallback(() => Promise.all([
    dbGetAll(db, 'task').then(setTasks),
    dbGetAll(db, 'request').then(setRequests),
  ]), [db]);
  useEffect(() => { load(); }, [load]);

  async function addTask(e: Event) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const newItem = taskKind === 'request'
      ? makeTask('request', { title: t, starred, dayNight })
      : makeTask('task',    { title: t, starred, dayNight });
    await dbAdd(db, newItem);
    setTitle('');
    setStarred(false);
    setDayNight(DayNight.NIGHT);
    load();
  }

  async function toggle(task: EditableTask) {
    await dbPut(db, { ...task, completedAt: task.completedAt ? null : todayStr() });
    load();
  }

  async function remove(id: number) {
    await dbDelete(db, id);
    load();
  }

  async function saveEdit(patch: Pick<EditableTask, 'title' | 'starred' | 'dayNight'>) {
    if (!editing) return;
    await dbPut(db, { ...editing, ...patch });
    setEditing(null);
    load();
  }

  const pendingTasks     = tasks.filter(t => t.completedAt === null);
  const pendingRequests  = requests.filter(r => r.completedAt === null);
  const completedTasks   = tasks.filter(t => t.completedAt !== null && t.completedAt >= yesterdayStr());
  const completedReqs    = requests.filter(r => r.completedAt !== null && r.completedAt >= yesterdayStr());

  const isEmpty = tasks.length === 0 && requests.length === 0;

  return (
    <div>
      <form className="add-form" onSubmit={addTask}>
        <div className="add-form-title">New Task</div>
        <div className="form-row">
          <div className="form-group">
            <label>Type</label>
            <select value={taskKind} onChange={e => setTaskKind((e.target as HTMLSelectElement).value as 'task' | 'request')}>
              <option value="task">Task</option>
              <option value="request">Request</option>
            </select>
          </div>
          <StarToggle starred={starred} onToggle={() => setStarred(p => !p)} style={{ alignSelf: 'flex-end' }} />
          <TitleInput value={title} onChange={setTitle} placeholder="What needs to be done?" autoFocus />
          <DayNightSelect value={dayNight} onChange={setDayNight} />
          <button className="btn btn-primary" type="submit" style={{ alignSelf: 'flex-end' }}>
            Add
          </button>
        </div>
      </form>

      {isEmpty && (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <p>No tasks yet — add one above.</p>
        </div>
      )}

      {pendingTasks.length > 0 && (
        <>
          <div className="section-label">To Do · {pendingTasks.length}</div>
          <div className="task-list" style={{ marginBottom: 20 }}>
            {pendingTasks.map(task => (
              <div className="task-card" key={task.id}>
                <div className="task-card-header">
                  <input type="checkbox" checked={false} onChange={() => toggle(task)} />
                  <span className="task-title">{task.title}</span>
                  <button className="btn-icon btn-edit" title="Edit" onClick={() => setEditing(task)}>🖌</button>
                  <DeleteButton onConfirm={() => remove(task.id)} />
                </div>
                <TaskMeta starred={task.starred} dayNight={task.dayNight} />
              </div>
            ))}
          </div>
        </>
      )}

      {pendingRequests.length > 0 && (
        <>
          <div className="section-label">Requests · {pendingRequests.length}</div>
          <div className="task-list" style={{ marginBottom: 20 }}>
            {pendingRequests.map(req => (
              <div className="task-card" key={req.id}>
                <div className="task-card-header">
                  <input type="checkbox" checked={false} onChange={() => toggle(req)} />
                  <span className="task-title">{req.title}</span>
                  <button className="btn-icon btn-edit" title="Edit" onClick={() => setEditing(req)}>🖌</button>
                  <DeleteButton onConfirm={() => remove(req.id)} />
                </div>
                <TaskMeta starred={req.starred} dayNight={req.dayNight} />
              </div>
            ))}
          </div>
        </>
      )}

      {(completedTasks.length > 0 || completedReqs.length > 0) && (
        <>
          <div className="section-label">Completed · {completedTasks.length + completedReqs.length}</div>
          <div className="task-list">
            {[...completedTasks, ...completedReqs].map(task => (
              <div className="task-card" key={task.type + '-' + task.id} style={{ opacity: 0.65 }}>
                <div className="task-card-header">
                  <input type="checkbox" checked={true} onChange={() => toggle(task)} />
                  <span className="task-title completed">{task.title}</span>
                  <button className="btn-icon btn-edit" title="Edit" onClick={() => setEditing(task)}>🖌</button>
                  <DeleteButton onConfirm={() => remove(task.id)} />
                </div>
                <TaskMeta starred={task.starred} dayNight={task.dayNight} />
              </div>
            ))}
          </div>
        </>
      )}

      {editing && (
        <EditModal
          task={editing}
          onSave={saveEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── Badge display ─────────────────────────────────────────────────────────────

function TaskMeta({ starred, dayNight }: { starred: boolean; dayNight: typeof DayNight[keyof typeof DayNight] }) {
  return (
    <div className="task-meta-row">
      <span className="badge badge-gray">{dayNight === DayNight.NIGHT ? DayNightLabel.NIGHT : DayNightLabel.DAY}</span>
      {starred && <span className="badge badge-amber">★ Starred</span>}
    </div>
  );
}

function EditModal({
  task,
  onSave,
  onClose,
}: {
  task: EditableTask;
  onSave: (patch: Pick<EditableTask, 'title' | 'starred' | 'dayNight'>) => void;
  onClose: () => void;
}) {
  const [title, setTitle]       = useState(task.title);
  const [starred, setStarred]   = useState(task.starred);
  const [dayNight, setDayNight] = useState<typeof DayNight[keyof typeof DayNight]>(task.dayNight ?? DayNight.NIGHT);
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
    onSave({ title: t, starred, dayNight });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Edit {task.type === 'request' ? 'Request' : 'Task'}</span>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-row" style={{ marginBottom: 16 }}>
            <StarToggle starred={starred} onToggle={() => setStarred(p => !p)} style={{ alignSelf: 'flex-end' }} />
            <TitleInput value={title} onChange={setTitle} inputRef={inputRef} />
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
