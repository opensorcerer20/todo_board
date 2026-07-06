import { theme, healthStyle } from '../theme';
import { habitHealth, habitDetail } from '../lib/frequency';
import type { Habit } from '../data/types';

export function HabitRow({ habit, onLog }: {
  habit: Habit;
  onLog: (id: string | number) => void;
}) {
  const health = habitHealth({ logs: habit.logs ?? 0, window: habit.window ?? 30, daysSinceLast: habit.daysSinceLast });
  const hs = healthStyle[health.key];
  const detail = habitDetail(habit, health);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderTop: `1px solid ${theme.color.divider}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#dfe2ea' }}>{habit.title}</div>
        <div style={{ fontFamily: theme.font.mono, fontSize: 10.5, color: '#7a818f', marginTop: 3 }}>{detail}</div>
      </div>

      <div style={{ display: 'flex', gap: 3 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ width: 6, height: 18, borderRadius: 2, background: i < health.level ? hs.color : '#262b34' }} />
        ))}
      </div>

      <div style={{
        fontFamily: theme.font.mono, fontSize: 10.5, fontWeight: 700,
        letterSpacing: '.04em', textTransform: 'uppercase' as const,
        color: hs.color, background: hs.bg, padding: '5px 10px',
        borderRadius: 7, whiteSpace: 'nowrap' as const, width: 74, textAlign: 'center' as const,
      }}>
        {health.label}
      </div>

      <button
        onClick={() => onLog(habit.id)}
        style={{
          background: 'transparent', color: theme.color.goodText, fontFamily: theme.font.sans,
          fontSize: 12.5, fontWeight: 600, border: '1px solid #2a3a30',
          padding: '7px 13px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' as const,
        }}
      >
        ＋ Log
      </button>
    </div>
  );
}
