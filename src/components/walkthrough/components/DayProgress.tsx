import { theme } from '../theme';

export function DayProgress({ done, total }: { done: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 5, margin: '20px 0 26px' }}>
      {Array.from({ length: Math.max(total, 1) }).map((_, i) => (
        <div
          key={i}
          style={{ flex: 1, height: 5, borderRadius: 99, background: i < done ? theme.color.good : '#222831' }}
        />
      ))}
    </div>
  );
}
