import { theme } from './theme';
import { useDayData } from './data/useDayData';
import { createMockAdapter } from './data/createMockAdapter';
import { DayProgress } from './components/DayProgress';
import { TaskRow } from './components/TaskRow';
import { HabitRow } from './components/HabitRow';
import { AddItemForm } from './components/AddItemForm';
import type { DayDataAdapter } from './data/types';

const mono = theme.font.mono;

const sectionLabel = {
  fontFamily: mono, fontSize: 11, letterSpacing: '.12em',
  color: '#7a818f', textTransform: 'uppercase' as const,
};
const sectionChip = { fontFamily: mono, fontSize: 11, color: theme.color.textFaint };
const rowBetween  = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 };

const defaultAdapter = createMockAdapter();

export default function DayWalkthrough({
  adapter = defaultAdapter,
  dateLabel = 'Today',
  priorDoneCount = 0,
}: {
  adapter?: DayDataAdapter;
  dateLabel?: string;
  priorDoneCount?: number;
}) {
  const { items, habits, openCount, doneCount, loading, error, actions } = useDayData(adapter);

  const totalToday = items.length + priorDoneCount;
  const doneToday  = doneCount + priorDoneCount;

  return (
    <div style={{
      minHeight: '100vh', background: theme.color.bg, fontFamily: theme.font.sans,
      color: theme.color.text, padding: '40px 28px 72px', WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', color: theme.color.textStrong }}>
              Let's walk through your day
            </div>
            <div style={{ fontSize: 13.5, color: theme.color.textMuted, marginTop: 5 }}>
              {dateLabel} · {openCount} to do
            </div>
          </div>
          <div style={{
            fontFamily: mono, fontSize: 11, color: theme.color.goodText,
            background: '#16201a', border: '1px solid #25382b', padding: '7px 12px', borderRadius: 10,
          }}>
            {doneToday} done today
          </div>
        </header>

        <DayProgress done={doneToday} total={totalToday} />

        {error && (
          <div style={{ color: '#d98a6a', fontFamily: mono, fontSize: 12, marginBottom: 16 }}>
            Couldn't sync: {String((error as Error).message || error)}
          </div>
        )}

        {/* To do */}
        <div style={rowBetween}>
          <div style={sectionLabel}>To do today</div>
          <div style={sectionChip}>{loading ? 'loading…' : `${openCount} open`}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
          {items.map(item => (
            <TaskRow
              key={item.id}
              item={item}
              onToggle={actions.toggleDone}
              onLog={actions.logProgress}
              onDefer={actions.defer}
            />
          ))}
        </div>

        <div style={{ marginBottom: 34 }}>
          <AddItemForm onAdd={actions.addItem} />
        </div>

        {/* Habits */}
        <div style={{ ...rowBetween, marginBottom: 6 }}>
          <div style={sectionLabel}>Habit health</div>
          <div style={sectionChip}>last 30 days</div>
        </div>
        <div style={{ background: theme.color.card, border: `1px solid ${theme.color.cardBorder}`, borderRadius: 16, padding: '8px 18px 4px' }}>
          {(habits as any[]).map(habit => (
            <HabitRow key={habit.id} habit={habit} onLog={actions.logHabit} />
          ))}
        </div>
      </div>
    </div>
  );
}
