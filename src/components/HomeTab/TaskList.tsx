import { ProjectBadges } from './ProjectBadges';
import { MONO, taskBoxStyle, taskTitleStyle } from './styles';
import type { TaskItem } from './types';

export function TaskList({ items }: { items: TaskItem[] }) {
  const pinned = items.filter(t => t.starred);
  const other  = items.filter(t => !t.starred);
  return (
    <div>
      {pinned.length > 0 && (
        <div style={{ background: 'var(--pinned-bg)', border: '1px solid var(--pinned-border)', borderRadius: '12px', padding: '4px 14px 8px', marginBottom: '10px' }}>
          <div style={{ fontFamily: MONO, fontSize: '10px', letterSpacing: '.12em', color: 'var(--pinned-label)', textTransform: 'uppercase' as const, padding: '10px 0 2px' }}>★ Pinned · do first</div>
          {pinned.map(t => (
            <div key={t.key} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '11px 0' }}>
              <div style={taskBoxStyle(t.done)}>{t.done && '✓'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ color: 'var(--warning)', fontSize: '13px', lineHeight: '1' }}>★</span>
                  <span style={taskTitleStyle(t.done)}>{t.title}</span>
                </div>
                {t.isProject && <ProjectBadges name={t.projectName} label={t.stepLabel} indent />}
              </div>
            </div>
          ))}
        </div>
      )}
      {other.map(t => (
        <div key={t.key} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 2px', borderTop: '1px solid var(--border)' }}>
          <div style={taskBoxStyle(t.done)}>{t.done && '✓'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={taskTitleStyle(t.done)}>{t.title}</span>
            {t.isProject && <ProjectBadges name={t.projectName} label={t.stepLabel} />}
          </div>
        </div>
      ))}
    </div>
  );
}
