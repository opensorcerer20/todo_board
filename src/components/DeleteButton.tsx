import { useState } from 'preact/hooks';

interface Props {
  onConfirm: () => void;
}

export function DeleteButton({ onConfirm }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function open(e: MouseEvent) {
    e.stopPropagation();
    setPos({ x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY });
  }

  return (
    <>
      <button className="btn-icon" title="Delete" onClick={open}>×</button>
      {pos && (
        <DeletePopover
          x={pos.x}
          y={pos.y}
          onConfirm={() => { setPos(null); onConfirm(); }}
          onDismiss={() => setPos(null)}
        />
      )}
    </>
  );
}

function DeletePopover({ x, y, onConfirm, onDismiss }: {
  x: number; y: number;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 199 }}
        onClick={onDismiss}
      />
      <div style={{
        position: 'fixed',
        left: x,
        top: y + 8,
        transform: 'translateX(-100%)',
        zIndex: 200,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        padding: '10px 12px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Delete?</span>
        <button
          style={{ background: 'var(--cancel)', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          onClick={onDismiss}
        >
          Cancel
        </button>
        <button
          style={{ background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          onClick={onConfirm}
        >
          Confirm
        </button>
      </div>
    </>
  );
}
