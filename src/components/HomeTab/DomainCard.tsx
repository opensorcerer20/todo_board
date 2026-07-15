import { HabitList } from './HabitList';
import { MONO } from './styles';
import { TaskList } from './TaskList';
import type {
  HabitItem,
  TaskItem,
} from './types';

export function DomainCard({
  label,
  taskItems,
  habits,
  testId,
}: {
  label: string;
  taskItems: TaskItem[];
  habits: HabitItem[];
  testId?: string;
}) {
  const emptyStyle = { fontFamily: MONO, fontSize: '12px', color: 'var(--text-dim)', padding: '4px 0 8px' };
  return (
    <div
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px 22px 10px' }}
      data-testid={testId}
    >
      <div style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '.12em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: '10px' }}>{label}</div>

      {taskItems.length > 0
        ? <TaskList items={taskItems} />
        : <div style={emptyStyle}>No tasks</div>}

      <div style={habits.length > 0 && taskItems.length > 0 ? { borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '2px' } : undefined}>
        {habits.length > 0
          ? <HabitList habits={habits} />
          : <div style={emptyStyle}>No habits</div>}
      </div>
    </div>
  );
}
