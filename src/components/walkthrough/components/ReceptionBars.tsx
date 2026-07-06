import { deferColor } from '../theme';

export function ReceptionBars({ deferred = 0, size = 'sm' }: { deferred?: number; size?: 'sm' | 'lg' }) {
  const filled = Math.min(deferred, 4);
  const heights = size === 'lg' ? [7, 11, 15, 18] : [6, 9, 12, 15];
  const w = size === 'lg' ? 4 : 3.5;
  const fg = deferColor(filled);
  return (
    <div
      title={deferred ? `Deferred ${deferred} day${deferred === 1 ? '' : 's'}` : 'Not deferred'}
      style={{ display: 'flex', alignItems: 'flex-end', gap: size === 'lg' ? 3 : 2.5, height: heights[3] }}
    >
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          style={{ width: w, height: heights[i], borderRadius: 2, background: i < filled ? fg : '#262b34' }}
        />
      ))}
    </div>
  );
}
