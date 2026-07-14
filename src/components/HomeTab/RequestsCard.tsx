import type { RequestTask } from '../../types';
import { MONO } from './styles';

export function RequestsCard({ requests }: { requests: RequestTask[] }) {
  const pending = requests.filter(r => r.completedAt === null);
  if (pending.length === 0) return null;

  const starred = pending.filter(r => r.starred);
  const rest    = pending.filter(r => !r.starred);
  const sorted  = [...starred, ...rest];

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px' }}>
      <div style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '14px' }}>
        Requests · {pending.length}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {sorted.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', ...(i > 0 ? { borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' } : {}) }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>
                {r.starred && <span style={{ color: 'var(--warning)', marginRight: '5px' }}>★</span>}
                {r.title}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
