import type { MultiStepProject } from '../../types';
import { MONO } from './styles';

export function ProjectsCard({ projects }: { projects: MultiStepProject[] }) {
  const activeProjects = projects.filter(p => !p.deferred);

  const mappedProjects = activeProjects.map(p => {
    const completedCount = p.steps.filter(s => s.completedAt !== null).length;
    const total = p.steps.length;
    const incomplete = p.steps.filter(s => s.completedAt === null);
    const currentStep = incomplete[0];
    const nextStep    = incomplete[1];
    const stepNo = Math.min(completedCount + 1, total);
    return {
      id: p.id, name: p.title,
      stepLabel: 'Step ' + stepNo + ' of ' + total,
      current: currentStep?.title ?? '(all steps done)',
      currentStarred: currentStep?.starred ?? false,
      next: nextStep?.title ?? '',
      nextStarred: nextStep?.starred ?? false,
      hasNext: !!nextStep,
      barStyle: {
        height: '100%', background: 'var(--primary)', borderRadius: '99px',
        width: (completedCount === 0 ? 1 : Math.round((completedCount / Math.max(total, 1)) * 100)) + '%',
      },
    };
  });

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontFamily: MONO, fontSize: '11px', letterSpacing: '.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active projects</div>
        <div style={{ fontFamily: MONO, fontSize: '11px', color: 'var(--text-dim)' }}>{mappedProjects.length} active</div>
      </div>

      {mappedProjects.length === 0 ? (
        <div style={{ fontFamily: MONO, fontSize: '12px', color: 'var(--text-dim)', padding: '8px 0' }}>No active projects</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {mappedProjects.map((p, i) => (
            <div key={p.id} style={i > 0 ? { borderTop: '1px solid var(--border)', marginTop: '18px', paddingTop: '18px' } : {}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                <div style={{ fontFamily: MONO, fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{p.stepLabel}</div>
              </div>
              <div style={{ height: '5px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden', margin: '10px 0 11px' }}>
                <div style={p.barStyle}></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--surface-2)', borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '6px', background: 'transparent', border: '1.5px solid var(--checkbox-border)', flexShrink: 0, marginTop: '1px' }}></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', color: 'var(--text)', fontWeight: 500 }}>
                    {p.currentStarred && <span style={{ color: 'var(--warning)', marginRight: '5px' }}>★</span>}
                    {p.current}
                  </div>
                </div>
              </div>
              {p.hasNext && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginTop: '8px', paddingLeft: '2px' }}>
                  <span style={{ fontFamily: MONO, fontSize: '9px', color: '#8fa5d0', border: '1px solid rgba(111,125,165,0.3)', borderRadius: '99px', padding: '2px 8px', letterSpacing: '.06em', textTransform: 'uppercase', background: 'rgba(111,125,165,0.12)', flexShrink: 0 }}>On deck</span>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', minWidth: 0 }}>
                    {p.nextStarred && <span style={{ color: 'var(--warning)', marginRight: '4px' }}>★</span>}
                    {p.next}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
