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
import type { PlainTask } from '../types';
import { DayNight, DayNightLabel } from '../types';
import {
  DayNightSelect,
  StarToggle,
  TitleInput,
} from './fields';
import {
  makeTask,
  todayStr,
} from '../utils';

interface Props { db: IDBDatabase }

export default function TasksTab({ db }: Props) {
  const [tasks, setTasks]       = useState<PlainTask[]>([]);
  const [title, setTitle]       = useState('');
  const [starred, setStarred]   = useState(false);
  const [dayNight, setDayNight] = useState<typeof DayNight[keyof typeof DayNight]>(DayNight.NIGHT);
  const [editing, setEditing]   = useState<PlainTask | null>(null);

  const load = useCallback(() => dbGetAll(db, 'task').then(setTasks), [db]);
  useEffect(() => { load(); }, [load]);

  async function addTask(e: Event) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    await dbAdd(db, makeTask('task', { title: t, starred, dayNight }));
    setTitle('');
    setStarred(false);
    setDayNight(DayNight.NIGHT);
    load();
  }

  async function toggle(task: PlainTask) {
    await dbPut(db, { ...task, completedAt: task.completedAt ? null : todayStr() });
    load();
  }

  async function remove(id: number) {
    await dbDelete(db, id);
    load();
  }

  async function saveEdit(patch: Pick<PlainTask, 'title' | 'starred' | 'dayNight'>) {
    if (!editing) return;
    await dbPut(db, { ...editing, ...patch });
    setEditing(null);
    load();
  }

  const pending   = tasks.filter(t => t.completedAt === null);
  const completed = tasks.filter(t => t.completedAt !== null);

  return (
    <div>
      <form className="add-form" onSubmit={addTask}>
        <div className="add-form-title">New Task</div>
        <div className="form-row">
          <StarToggle starred={starred} onToggle={() => setStarred(p => !p)} style={{ alignSelf: 'flex-end' }} />
          <TitleInput value={title} onChange={setTitle} placeholder="What needs to be done?" autoFocus />
          <DayNightSelect value={dayNight} onChange={setDayNight} />
          <button className="btn btn-primary" type="submit" style={{ alignSelf: 'flex-end' }}>
            Add
          </button>
        </div>
      </form>

      {tasks.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <p>No tasks yet — add one above.</p>
        </div>
      )}

      {pending.length > 0 && (
        <>
          <div className="section-label">To Do · {pending.length}</div>
          <div className="task-list" style={{ marginBottom: 20 }}>
            {pending.map(task => (
              <div className="task-card" key={task.id}>
                <div className="task-card-header">
                  <input type="checkbox" checked={false} onChange={() => toggle(task)} />
                  <span className="task-title">{task.title}</span>
                  <button className="btn-icon btn-edit" title="Edit" onClick={() => setEditing(task)}>🖌</button>
                  <button className="btn-icon" title="Delete" onClick={() => remove(task.id)}>×</button>
                </div>
                <TaskMeta starred={task.starred} dayNight={task.dayNight} />
              </div>
            ))}
          </div>
        </>
      )}

      {completed.length > 0 && (
        <>
          <div className="section-label">Completed · {completed.length}</div>
          <div className="task-list">
            {completed.map(task => (
              <div className="task-card" key={task.id} style={{ opacity: 0.65 }}>
                <div className="task-card-header">
                  <input type="checkbox" checked={true} onChange={() => toggle(task)} />
                  <span className="task-title completed">{task.title}</span>
                  <button className="btn-icon btn-edit" title="Edit" onClick={() => setEditing(task)}>🖌</button>
                  <button className="btn-icon" title="Delete" onClick={() => remove(task.id)}>×</button>
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
  task: PlainTask;
  onSave: (patch: Pick<PlainTask, 'title' | 'starred' | 'dayNight'>) => void;
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
          <span className="modal-title">Edit Task</span>
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
