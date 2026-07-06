import { theme } from '../theme';
import { ReceptionBars } from './ReceptionBars';
import type { Item } from '../lib/sorting';

const mono = theme.font.mono;

export function TaskRow({ item, onToggle, onLog, onDefer }: {
  item: Item;
  onToggle: (id: string | number, done: boolean) => void;
  onLog: (id: string | number) => void;
  onDefer: (id: string | number) => void;
}) {
  const badge = (theme.badge as Record<string, { bg: string; fg: string; label: string }>)[item.type] ?? theme.badge.task;
  const done = !!item.done;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 13,
      background: theme.color.card, border: `1px solid ${theme.color.cardBorder}`,
      borderRadius: 13, padding: '13px 15px',
    }}>
      <button
        aria-label={done ? 'Mark not done' : 'Mark done'}
        onClick={() => onToggle(item.id, !done)}
        style={{
          width: 21, height: 21, borderRadius: 6, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 13,
          flexShrink: 0, cursor: 'pointer', padding: 0, transition: 'all .12s ease',
          background: done ? theme.color.good : 'transparent',
          border: `1.5px solid ${done ? theme.color.good : theme.color.text}`,
          color: done ? '#fff' : 'transparent',
        }}
      >
        ✓
      </button>

      <span style={badgeStyle(badge, done)}>{badge.label}</span>

      {item.starred && <span style={{ color: theme.color.star, fontSize: 12, lineHeight: '1', flexShrink: 0 }}>★</span>}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, color: done ? '#5f6678' : theme.color.text, textDecoration: done ? 'line-through' : 'none' }}>
          {item.title}
        </div>
        {item.meta && (
          <div style={{ fontFamily: mono, fontSize: 10.5, color: '#838ca2', marginTop: 3 }}>{item.meta}</div>
        )}
      </div>

      <ReceptionBars deferred={item.deferred} />

      <button style={pillStyle(theme.color.goodText, '#2a3a30')} onClick={() => onLog(item.id)}>⟳ Log</button>
      <button style={pillStyle('#7a818f', '#2a3039')} onClick={() => onDefer(item.id)}>→ Defer</button>
    </div>
  );
}

function badgeStyle(badge: { bg: string; fg: string }, done: boolean) {
  return {
    fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
    textTransform: 'uppercase' as const, padding: '3px 8px', borderRadius: 5,
    whiteSpace: 'nowrap' as const, flexShrink: 0,
    background: badge.bg, color: badge.fg, opacity: done ? 0.5 : 1,
  };
}

function pillStyle(fg: string, border: string) {
  return {
    background: 'transparent', color: fg, fontFamily: theme.font.sans,
    fontSize: 12.5, fontWeight: 600, border: `1px solid ${border}`,
    padding: '7px 12px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' as const,
  };
}
