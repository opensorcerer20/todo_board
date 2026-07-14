import { habitCircleStyle, MONO } from './styles';
import type { HabitItem } from './types';

export function HabitList({ habits }: { habits: HabitItem[] }) {
  if (habits.length === 0) return null;

  const sorted = [...habits].sort((a, b) => Number(b.starred) - Number(a.starred));

  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '.12em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: '2px', paddingTop: '5px', paddingBottom: '5px' }}>Habits</div>
      {sorted.map(h => (
        <div
          key={h.id}
          data-testid={`habit-row-${h.id}`}
          style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '11px 0', borderTop: '1px solid var(--border)' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              {h.starred && <span style={{ color: 'var(--warning)', fontSize: '13px', lineHeight: '1' }}>★</span>}
              <span style={{ fontSize: '15px', color: 'var(--text)', fontWeight: 500 }}>{h.title}</span>
            </div>
            <span
              className="habit-streak-label"
              style={{ display: 'inline-block', marginTop: '5px', fontFamily: MONO, fontSize: '10px', color: '#7fb295', border: '1px solid rgba(95,143,116,0.3)', borderRadius: '99px', padding: '2px 8px', whiteSpace: 'nowrap', background: 'rgba(95,143,116,0.12)' }}
            >
              {h.streakLabel}
            </span>
          </div>
          <div style={habitCircleStyle(h.doneToday)}>{h.doneToday && '✓'}</div>
        </div>
      ))}
    </div>
  );
}
