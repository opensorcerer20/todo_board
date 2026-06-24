import { useState, useEffect, useCallback } from 'preact/hooks';
import { dbGetAll } from '../db';
import { todayStr, resetLabel, canLog } from '../utils';
import type { PlainTask, RepeatedTask, MultiStepProject, MultistepTask } from '../types';

interface Props { db: IDBDatabase }

interface NextStep {
  project: MultiStepProject;
  step: MultistepTask;
}

export default function HomeTab({ db }: Props) {
  const [tasks,    setTasks]    = useState<PlainTask[]>([]);
  const [repeated, setRepeated] = useState<RepeatedTask[]>([]);
  const [projects, setProjects] = useState<MultiStepProject[]>([]);

  const load = useCallback(() => Promise.all([
    dbGetAll(db, 'task').then(setTasks),
    dbGetAll(db, 'repeated').then(setRepeated),
    dbGetAll(db, 'multistep').then(setProjects),
  ]), [db]);

  useEffect(() => { load(); }, [load]);

  const today = todayStr();

  const visibleTasks = tasks.filter(t => t.completedAt === null || t.completedAt === today);

  const nextSteps: NextStep[] = projects.flatMap(p => {
    const step = p.steps.find(s => s.completedAt === null);
    return step ? [{ project: p, step }] : [];
  });

  const hasAnything = visibleTasks.length > 0 || repeated.length > 0 || nextSteps.length > 0;

  if (!hasAnything) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <p>Nothing here yet — add tasks in the other tabs.</p>
      </div>
    );
  }

  return (
    <div>
      {visibleTasks.length > 0 && (
        <>
          <div className="section-label">Tasks · {visibleTasks.length}</div>
          <div className="task-list" style={{ marginBottom: 20 }}>
            {visibleTasks.map(task => (
              <div className="task-card" key={task.id} style={{ opacity: task.completedAt ? 0.65 : 1 }}>
                <div className="task-card-header">
                  <span className={'task-title' + (task.completedAt ? ' completed' : '')}>
                    {task.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {repeated.length > 0 && (
        <>
          <div className="section-label">Repeat Tasks · {repeated.length}</div>
          <div className="task-list" style={{ marginBottom: 20 }}>
            {repeated.map(task => {
              const eligible = canLog(task);
              return (
                <div className="task-card" key={task.id}>
                  <div className="task-card-header">
                    <span className="task-title">{task.title}</span>
                    <span className={`badge ${eligible ? 'badge-purple' : 'badge-amber'}`}>
                      {eligible ? resetLabel(task) : 'Logged ✓'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {nextSteps.length > 0 && (
        <>
          <div className="section-label">Next Steps · {nextSteps.length}</div>
          <div className="task-list">
            {nextSteps.map(({ project, step }) => (
              <div className="task-card" key={project.id}>
                <div className="task-card-header">
                  <span className="task-title">{step.title}</span>
                  <span className="badge badge-gray">{project.title}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
