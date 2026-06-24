import { useState, useEffect, useCallback } from 'preact/hooks';
import { dbGetAll, dbAdd, dbPut, dbDelete } from '../db';
import { makeTask, newStep, multistepComplete, todayStr } from '../utils';
import { DayNight } from '../types';
import type { MultiStepProject, MultistepTask } from '../types';

interface Props { db: IDBDatabase }

export default function MultistepTab({ db }: Props) {
  const [tasks, setTasks]       = useState<MultiStepProject[]>([]);
  const [title, setTitle]       = useState('');
  const [steps, setSteps]       = useState<MultistepTask[]>([newStep()]);
  const [deferred, setDeferred] = useState(false);

  const load = useCallback(() => dbGetAll(db, 'multistep').then(setTasks), [db]);
  useEffect(() => { load(); }, [load]);

  function addStep() {
    setSteps(prev => [...prev, newStep()]);
  }

  function updateStep(id: string, patch: Partial<Pick<MultistepTask, 'title' | 'starred' | 'dayNight'>>) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  function removeStep(id: string) {
    setSteps(prev => prev.filter(s => s.id !== id));
  }

  function moveStep(index: number, dir: number) {
    const target = index + dir;
    setSteps(prev => {
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function addTask(e: Event) {
    e.preventDefault();
    const t = title.trim();
    const validSteps = steps
      .filter(s => s.title.trim())
      .map(s => ({ ...s, title: s.title.trim() }));
    if (!t || validSteps.length === 0) return;
    await dbAdd(db, makeTask('multistep', { title: t, steps: validSteps, deferred }));
    setTitle('');
    setSteps([newStep()]);
    setDeferred(false);
    load();
  }

  async function toggleStep(project: MultiStepProject, stepId: string) {
    await dbPut(db, {
      ...project,
      steps: project.steps.map(s =>
        s.id === stepId ? { ...s, completedAt: s.completedAt ? null : todayStr() } : s
      ),
    });
    load();
  }

  async function remove(id: number) {
    await dbDelete(db, id);
    load();
  }

  return (
    <div>
      <form className="add-form" onSubmit={addTask}>
        <div className="add-form-title">New Multistep Task</div>

        <div className="form-row" style={{ marginBottom: 16 }}>
          <div className="form-group grow">
            <label>Task Name</label>
            <input
              type="text"
              value={title}
              onInput={e => setTitle((e.target as HTMLInputElement).value)}
              placeholder="Task name…"
              autoFocus
            />
          </div>
          <label className="step-deferred-label" style={{ alignSelf: 'flex-end', paddingBottom: 8 }}>
            <input
              type="checkbox"
              checked={deferred}
              onChange={() => setDeferred(prev => !prev)}
            />
            Defer
          </label>
        </div>

        <div className="steps-builder">
          <div className="steps-builder-label">Steps</div>
          {steps.map((step, i) => (
            <div className="step-builder-row" key={step.id}>
              <span className="step-num">{i + 1}</span>
              <input
                type="text"
                value={step.title}
                onInput={e => updateStep(step.id, { title: (e.target as HTMLInputElement).value })}
                placeholder={`Step ${i + 1}…`}
              />
              <button
                type="button"
                className={'btn-star btn-star-sm' + (step.starred ? ' active' : '')}
                onClick={() => updateStep(step.id, { starred: !step.starred })}
                title={step.starred ? 'Starred' : 'Not starred'}
              >
                {step.starred ? '★' : '☆'}
              </button>
              <select
                className="step-day-night"
                value={step.dayNight}
                onChange={e => updateStep(step.id, { dayNight: (e.target as HTMLSelectElement).value as DayNight })}
              >
                <option value="day">☀️</option>
                <option value="night">🌙</option>
              </select>
              <div className="step-order-btns">
                <button
                  type="button"
                  className="btn-order"
                  onClick={() => moveStep(i, -1)}
                  disabled={i === 0}
                  title="Move up"
                >▲</button>
                <button
                  type="button"
                  className="btn-order"
                  onClick={() => moveStep(i, 1)}
                  disabled={i === steps.length - 1}
                  title="Move down"
                >▼</button>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => removeStep(step.id)}
                disabled={steps.length === 1}
                title="Remove step"
              >×</button>
            </div>
          ))}
          <button type="button" className="btn-add-step" onClick={addStep}>
            + Add Step
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" type="submit">Create Task</button>
        </div>
      </form>

      {tasks.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🪜</div>
          <p>No multistep tasks yet — add one above.</p>
        </div>
      )}

      <div className="task-list">
        {tasks.map(project => {
          const total   = project.steps.length;
          const done    = project.steps.filter(s => s.completedAt !== null).length;
          const allDone = multistepComplete(project);
          const pct     = total > 0 ? (done / total) * 100 : 0;

          return (
            <div className="task-card" key={project.id}>
              <div className="task-card-header">
                <span className={'task-title' + (allDone ? ' completed' : '')}>{project.title}</span>
                <span className={`badge ${allDone ? 'badge-green' : 'badge-gray'}`}>
                  {done}/{total}
                </span>
                <button className="btn-icon" title="Delete" onClick={() => remove(project.id)}>×</button>
              </div>

              {project.deferred && (
                <div className="task-meta-row">
                  <span className="badge badge-amber">⏸ Deferred</span>
                </div>
              )}

              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>

              <div className="steps-list">
                {project.steps.map(step => (
                  <label
                    className={'step-item' + (step.completedAt ? ' step-done' : '')}
                    key={step.id}
                  >
                    <input
                      type="checkbox"
                      checked={step.completedAt !== null}
                      onChange={() => toggleStep(project, step.id)}
                    />
                    <span className="step-item-title">{step.title}</span>
                    <span className="badge badge-gray step-badge">
                      {step.dayNight === DayNight.NIGHT ? '🌙' : '☀️'}
                    </span>
                    {step.starred && <span className="badge badge-amber step-badge">★</span>}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
