import { HabitList } from './HabitList';
import { MONO } from './styles';
import { TaskList } from './TaskList';
import type { HabitItem, TaskItem } from './types';

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
  const hasContent = taskItems.length > 0 || habits.length > 0;
  return (
    <div
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px 22px 10px' }}
      data-testid={testId}
    >
      <div style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '.12em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: '10px' }}>{label}</div>
      {!hasContent ? (
        <div style={{ fontFamily: MONO, fontSize: '12px', color: 'var(--text-dim)', padding: '4px 0 8px' }}>nothing here</div>
      ) : (
        <>
          <TaskList items={taskItems} />
          {habits.length > 0 && (
            <div style={taskItems.length > 0 ? { borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '2px' } : {}}>
              <HabitList habits={habits} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
