import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { dbGetAll, dbAdd, dbPut, dbDelete } from '../db';
import { makeTask, newStep, multistepComplete, todayStr } from '../utils';
import { DayNight } from '../types';
import type { MultiStepProject, MultistepTask } from '../types';
import { DayNightSelect, StarToggle } from './fields';

interface Props { db: IDBDatabase }

export default function MultistepTab({ db }: Props) {
  const [tasks, setTasks]       = useState<MultiStepProject[]>([]);
  const [title, setTitle]       = useState('');
  const [deferred, setDeferred] = useState(false);
  const [editing, setEditing]   = useState<MultiStepProject | null>(null);
  const { steps, setSteps, addStep, updateStep, removeStep, moveStep } = useStepManager([newStep()]);

  const load = useCallback(() => dbGetAll(db, 'multistep').then(setTasks), [db]);
  useEffect(() => { load(); }, [load]);

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

  async function saveEdit(patch: Pick<MultiStepProject, 'title' | 'deferred' | 'steps'>) {
    if (!editing) return;
    await dbPut(db, { ...editing, ...patch });
    setEditing(null);
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

        <StepBuilder
          steps={steps}
          onAdd={addStep}
          onUpdate={updateStep}
          onRemove={removeStep}
          onMove={moveStep}
        />

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

      {tasks.length > 0 && (() => {
        const active   = tasks.filter(p => !p.deferred);
        const deferred = tasks.filter(p => p.deferred);

        function renderCard(project: MultiStepProject) {
          const total   = project.steps.length;
          const done    = project.steps.filter(s => s.completedAt !== null).length;
          const allDone = multistepComplete(project);
          const pct     = total > 0 ? (done / total) * 100 : 0;
          return (
            <div className="task-card" key={project.id}>
              <div className="task-card-header">
                <span className={'task-title' + (allDone ? ' completed' : '')}>{project.title}</span>
                {project.deferred && <span className="badge badge-amber">⏸ Deferred</span>}
                <span className={`badge ${allDone ? 'badge-green' : 'badge-gray'}`}>
                  {done}/{total}
                </span>
                <button className="btn-icon btn-edit" title="Edit" onClick={() => setEditing(project)}>🖌</button>
                <button className="btn-icon" title="Delete" onClick={() => remove(project.id)}>×</button>
              </div>
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
        }

        return (
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="section-label">Active</div>
              {active.length === 0
                ? <div className="home-col-empty">No active projects</div>
                : <div className="task-list">{active.map(renderCard)}</div>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="section-label">Deferred</div>
              {deferred.length === 0
                ? <div className="home-col-empty">No deferred projects</div>
                : <div className="task-list">{deferred.map(renderCard)}</div>
              }
            </div>
          </div>
        );
      })()}

      {editing && (
        <EditProjectModal
          project={editing}
          onSave={saveEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── Shared step logic ─────────────────────────────────────────────────────────

function useStepManager(initial: MultistepTask[]) {
  const [steps, setSteps] = useState<MultistepTask[]>(initial);

  function addStep() { setSteps(prev => [...prev, newStep()]); }

  function updateStep(id: string, patch: Partial<Pick<MultistepTask, 'title' | 'starred' | 'dayNight'>>) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  function removeStep(id: string) { setSteps(prev => prev.filter(s => s.id !== id)); }

  function moveStep(index: number, dir: number) {
    const target = index + dir;
    setSteps(prev => {
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return { steps, setSteps, addStep, updateStep, removeStep, moveStep };
}

function StepBuilder({ steps, onAdd, onUpdate, onRemove, onMove }: {
  steps: MultistepTask[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Pick<MultistepTask, 'title' | 'starred' | 'dayNight'>>) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, dir: number) => void;
}) {
  return (
    <div className="steps-builder">
      <div className="steps-builder-label">Steps</div>
      {steps.map((step, i) => (
        <div className="step-builder-row" key={step.id}>
          <span className="step-num">{i + 1}</span>
          <input
            type="text"
            value={step.title}
            onInput={e => onUpdate(step.id, { title: (e.target as HTMLInputElement).value })}
            placeholder={`Step ${i + 1}…`}
          />
          <StarToggle size="sm" starred={step.starred} onToggle={() => onUpdate(step.id, { starred: !step.starred })} />
          <DayNightSelect compact value={step.dayNight} onChange={v => onUpdate(step.id, { dayNight: v })} />
          <div className="step-order-btns">
            <button type="button" className="btn-order" onClick={() => onMove(i, -1)} disabled={i === 0} title="Move up">▲</button>
            <button type="button" className="btn-order" onClick={() => onMove(i, 1)} disabled={i === steps.length - 1} title="Move down">▼</button>
          </div>
          <button type="button" className="btn-icon" onClick={() => onRemove(step.id)} disabled={steps.length === 1} title="Remove step">×</button>
        </div>
      ))}
      <button type="button" className="btn-add-step" onClick={onAdd}>+ Add Step</button>
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditProjectModal({
  project,
  onSave,
  onClose,
}: {
  project: MultiStepProject;
  onSave: (patch: Pick<MultiStepProject, 'title' | 'deferred' | 'steps'>) => void;
  onClose: () => void;
}) {
  const [title, setTitle]       = useState(project.title);
  const [deferred, setDeferred] = useState(project.deferred);
  const { steps, addStep, updateStep, removeStep, moveStep } = useStepManager(project.steps);
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
    const validSteps = steps
      .filter(s => s.title.trim())
      .map(s => ({ ...s, title: s.title.trim() }));
    if (!t || validSteps.length === 0) return;
    onSave({ title: t, deferred, steps: validSteps });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Edit Multistep Task</span>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-row" style={{ marginBottom: 16 }}>
            <div className="form-group grow">
              <label>Task Name</label>
              <input
                ref={inputRef}
                type="text"
                value={title}
                onInput={e => setTitle((e.target as HTMLInputElement).value)}
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

          <StepBuilder
            steps={steps}
            onAdd={addStep}
            onUpdate={updateStep}
            onRemove={removeStep}
            onMove={moveStep}
          />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
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
