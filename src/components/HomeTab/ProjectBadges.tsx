export function ProjectBadges({ name, label, indent = false }: { name: string; label: string; indent?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '5px', marginTop: '5px', ...(indent ? { marginLeft: '20px' } : {}), flexWrap: 'wrap' }}>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#8fa5d0', border: '1px solid rgba(111,125,165,0.3)', borderRadius: '99px', padding: '2px 8px', whiteSpace: 'nowrap', background: 'rgba(111,125,165,0.12)' }}>{name}</span>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: '#8fa5d0', border: '1px solid rgba(111,125,165,0.3)', borderRadius: '99px', padding: '2px 8px', whiteSpace: 'nowrap', background: 'rgba(111,125,165,0.12)' }}>{label}</span>
    </div>
  );
}
