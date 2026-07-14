export const MONO = "'Space Mono', monospace";

const BOX_BASE = {
  width: '19px', height: '19px', borderRadius: '6px', display: 'flex' as const,
  alignItems: 'center', justifyContent: 'center', fontSize: '12px',
  flexShrink: 0, marginTop: '1px',
};

const CIRCLE_BASE = {
  width: '27px', height: '27px', borderRadius: '50%', display: 'flex' as const,
  alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px',
};

export function taskBoxStyle(done: boolean) {
  return done
    ? { ...BOX_BASE, background: 'var(--primary)', border: '1.5px solid var(--primary)', color: '#fff' }
    : { ...BOX_BASE, background: 'transparent', border: '1.5px solid var(--checkbox-border)', color: 'transparent' };
}

export function taskTitleStyle(done: boolean) {
  return done
    ? { fontSize: '15px', fontWeight: 500, color: 'var(--text-muted)', textDecoration: 'line-through' as const }
    : { fontSize: '15px', fontWeight: 500, color: 'var(--text)' };
}

export function habitCircleStyle(done: boolean) {
  return done
    ? { ...CIRCLE_BASE, background: 'var(--success)', color: '#fff', border: '1px solid var(--success)' }
    : { ...CIRCLE_BASE, background: 'transparent', color: 'var(--text-muted)', border: '1.5px solid var(--border)' };
}
