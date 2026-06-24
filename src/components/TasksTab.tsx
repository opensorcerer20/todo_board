import { useState, useEffect, useCallback } from 'preact/hooks';
import { dbGetAll, dbAdd, dbPut, dbDelete } from '../db';
import { makeTask, todayStr } from '../utils';
import type { PlainTask } from '../types';

interface Props { db: IDBDatabase }

export default function TasksTab({ db }: Props) {
  const [tasks, setTasks] = useState<PlainTask[]>([]);
  const [title, setTitle] = useState('');

  const load = useCallback(() => dbGetAll(db, 'task').then(setTasks), [db]);
  useEffect(() => { load(); }, [load]);

  async function addTask(e: Event) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    await dbAdd(db, makeTask('task', { title: t }));
    setTitle('');
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

  const pending   = tasks.filter(t => t.completedAt === null);
  const completed = tasks.filter(t => t.completedAt !== null);

  return (
    <div>
      <form className="add-form" onSubmit={addTask}>
        <div className="add-form-title">New Task</div>
        <div className="form-row">
          <div className="form-group grow">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onInput={e => setTitle((e.target as HTMLInputElement).value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>
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
                  <button className="btn-icon" title="Delete" onClick={() => remove(task.id)}>×</button>
                </div>
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
                  <button className="btn-icon" title="Delete" onClick={() => remove(task.id)}>×</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
