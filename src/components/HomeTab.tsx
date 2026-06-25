import { useState, useEffect, useCallback } from 'preact/hooks';
import { dbGetAll } from '../db';
import { todayStr, resetLabel, canLog } from '../utils';
import { DayNight } from '../types';
import type { PlainTask, RepeatedTask, MultiStepProject, MultistepTask, DayNight as DayNightType } from '../types';

interface Props { db: IDBDatabase }

interface NextStep {
  project: MultiStepProject;
  step: MultistepTask;
}

interface TaskItem {
  kind: 'task';
  task: PlainTask;
}

interface StepItem {
  kind: 'step';
  project: MultiStepProject;
  step: MultistepTask;
}

type LeftItem = TaskItem | StepItem;

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
    if (p.deferred) return [];
    const step = p.steps.find(s => s.completedAt === null);
    return step ? [{ project: p, step }] : [];
  });

  function leftItems(dn: DayNightType): LeftItem[] {
    const taskItems: LeftItem[] = visibleTasks
      .filter(t => (t.dayNight ?? DayNight.NIGHT) === dn)
      .map(t => ({ kind: 'task', task: t }));
    const stepItems: LeftItem[] = nextSteps
      .filter(ns => (ns.step.dayNight ?? DayNight.NIGHT) === dn)
      .map(ns => ({ kind: 'step', project: ns.project, step: ns.step }));
    return [...taskItems, ...stepItems].sort((a, b) => {
      const aStarred = a.kind === 'task' ? a.task.starred : a.step.starred;
      const bStarred = b.kind === 'task' ? b.task.starred : b.step.starred;
      return (bStarred ? 1 : 0) - (aStarred ? 1 : 0);
    });
  }

  function repeatItems(dn: DayNightType): RepeatedTask[] {
    return [...repeated]
      .filter(t => (t.dayNight ?? DayNight.NIGHT) === dn)
      .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0));
  }

  const dayLeft    = leftItems(DayNight.DAY);
  const nightLeft  = leftItems(DayNight.NIGHT);
  const dayRight   = repeatItems(DayNight.DAY);
  const nightRight = repeatItems(DayNight.NIGHT);

  const hasAnything = dayLeft.length > 0 || nightLeft.length > 0 || dayRight.length > 0 || nightRight.length > 0;

  if (!hasAnything) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <p>Nothing here yet — add tasks in the other tabs.</p>
      </div>
    );
  }

  return (
    <div className="home-grid">
      <HomeColumn
        label="☀️ Day Tasks"
        items={dayLeft}
        today={today}
      />
      <HomeRepeatColumn
        label="☀️ Day Repeats"
        items={dayRight}
      />
      <HomeColumn
        label="🌙 Night Tasks"
        items={nightLeft}
        today={today}
      />
      <HomeRepeatColumn
        label="🌙 Night Repeats"
        items={nightRight}
      />
    </div>
  );
}

function HomeColumn({ label, items, today }: { label: string; items: LeftItem[]; today: string }) {
  if (items.length === 0) {
    return (
      <div className="home-col">
        <div className="home-col-label">{label}</div>
        <div className="home-col-empty">Nothing here</div>
      </div>
    );
  }

  return (
    <div className="home-col">
      <div className="home-col-label">{label} · {items.length}</div>
      <div className="task-list">
        {items.map(item => {
          if (item.kind === 'task') {
            const { task } = item;
            return (
              <div className="task-card" key={`task-${task.id}`} style={{ opacity: task.completedAt ? 0.65 : 1 }}>
                <div className="task-card-header">
                  {task.starred && <span className="task-star">★</span>}
                  <span className={'task-title' + (task.completedAt ? ' completed' : '')}>{task.title}</span>
                </div>
              </div>
            );
          }
          const { project, step } = item;
          return (
            <div className="task-card" key={`step-${project.id}`}>
              <div className="task-card-header">
                {step.starred && <span className="task-star">★</span>}
                <span className="task-title">{step.title}</span>
                <span className="badge badge-gray">{project.title}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HomeRepeatColumn({ label, items }: { label: string; items: RepeatedTask[] }) {
  if (items.length === 0) {
    return (
      <div className="home-col">
        <div className="home-col-label">{label}</div>
        <div className="home-col-empty">Nothing here</div>
      </div>
    );
  }

  return (
    <div className="home-col">
      <div className="home-col-label">{label} · {items.length}</div>
      <div className="task-list">
        {items.map(task => {
          const eligible = canLog(task);
          return (
            <div className="task-card" key={task.id}>
              <div className="task-card-header">
                {task.starred && <span className="task-star">★</span>}
                <span className="task-title">{task.title}</span>
                <span className={`badge ${eligible ? 'badge-purple' : 'badge-amber'}`}>
                  {eligible ? resetLabel(task) : 'Logged ✓'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
