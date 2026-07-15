import {
  useCallback,
  useEffect,
  useState,
} from 'preact/hooks';

import { dbExportAll } from '../../db';
import type {
  MultiStepProject,
  PlainTask,
  RepeatedTask,
  RequestTask,
} from '../../types';
import {
  DayNight,
  DayNightLabel,
  ItemType,
} from '../../types';
import {
  canLog,
  todayStr,
} from '../../utils';
import { DomainCard } from './DomainCard';
import { ProjectsCard } from './ProjectsCard';
import { RequestsCard } from './RequestsCard';
import { computeStreak, stepsLeftLabel, streakLabel } from './utils';
import type { HabitItem, TaskItem } from './types';

interface Props { db: IDBDatabase }

export default function HomeTab({ db }: Props) {
  const [tasks,    setTasks]    = useState<PlainTask[]>([]);
  const [requests, setRequests] = useState<RequestTask[]>([]);
  const [repeated, setRepeated] = useState<RepeatedTask[]>([]);
  const [projects, setProjects] = useState<MultiStepProject[]>([]);

  const load = useCallback(() => dbExportAll(db).then(all => {
    setTasks(all.filter(t => t.type === ItemType.TASK) as PlainTask[]);
    setRequests(all.filter(t => t.type === ItemType.REQUEST) as RequestTask[]);
    setRepeated(all.filter(t => t.type === ItemType.REPEATED) as RepeatedTask[]);
    setProjects(all.filter(t => t.type === ItemType.MULTISTEP) as MultiStepProject[]);
  }), [db]);

  useEffect(() => { load(); }, [load]);

  const today = todayStr();
  const activeProjects = projects.filter(p => !p.deferred);

  function buildTaskItems(dn: DayNight): TaskItem[] {
    const plain: TaskItem[] = tasks
      .filter(t => (t.dayNight ?? DayNight.NIGHT) === dn && (t.completedAt === null || t.completedAt === today))
      .map(t => ({
        key: 'task-' + t.id,
        title: t.title, done: t.completedAt !== null,
        starred: t.starred, projectName: '', stepLabel: '', isProject: false,
      }));

    const steps: TaskItem[] = activeProjects.flatMap(p => {
      const step = p.steps.find(s => s.completedAt === null);
      if (!step || (step.dayNight ?? DayNight.NIGHT) !== dn) return [];
      return [{
        key: 'step-' + p.id + '-' + step.id,
        title: step.title, done: false,
        starred: step.starred,
        projectName: p.title,
        stepLabel: stepsLeftLabel(p),
        isProject: true,
      }];
    });

    return [...plain, ...steps];
  }

  function buildHabits(dn: DayNight): HabitItem[] {
    return repeated
      .filter(t => (t.dayNight ?? DayNight.NIGHT) === dn)
      .map(t => ({
        id: t.id, title: t.title,
        doneToday: !canLog(t),
        streakLabel: streakLabel(t, computeStreak(t, today)),
        starred: t.starred,
      }));
  }

  const dayTaskItems   = buildTaskItems(DayNight.DAY);
  const nightTaskItems = buildTaskItems(DayNight.NIGHT);
  const dayHabits      = buildHabits(DayNight.DAY);
  const nightHabits    = buildHabits(DayNight.NIGHT);

  return (
    <div style={{ margin: '0 -16px', background: 'var(--bg)', padding: '28px 28px 64px', fontFamily: "'Hanken Grotesk', system-ui, sans-serif", color: 'var(--text)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '22px', alignItems: 'flex-start' }}>

        {/* LEFT column — tasks-panel wraps both domain cards so task/habit queries work across domains */}
        <div data-testid="tasks-panel" style={{ flex: '2 1 430px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <DomainCard label={DayNightLabel.DAY} taskItems={dayTaskItems} habits={dayHabits} testId="habits-panel" />
          <DomainCard label={DayNightLabel.NIGHT} taskItems={nightTaskItems} habits={nightHabits} testId="habits-panel" />
        </div>

        {/* RIGHT column — projects + requests */}
        <div style={{ flex: '1 1 290px', minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <ProjectsCard projects={projects} />
          <RequestsCard requests={requests} />
        </div>
      </div>
    </div>
  );
}
