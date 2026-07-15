import { useEffect, useRef, useState } from 'preact/hooks';

interface Props {
  onConfirm: () => void;
}

export function DeleteButton({ onConfirm }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function open(e: MouseEvent) {
    e.stopPropagation();
    setPos({ x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY });
  }

  function close() {
    setPos(null);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        className="btn-icon"
        title="Delete"
        aria-label="Delete"
        aria-haspopup="dialog"
        aria-expanded={!!pos}
        onClick={open}
      >×</button>
      {pos && (
        <DeletePopover
          x={pos.x}
          y={pos.y}
          onConfirm={() => { setPos(null); onConfirm(); }}
          onDismiss={close}
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
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onDismiss();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  return (
    <>
      <div
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, zIndex: 199 }}
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-popover-label"
        style={{
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
        }}
      >
        <span id="delete-popover-label" style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Delete?</span>
        <button
          style={{ background: 'var(--cancel)', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          onClick={onDismiss}
        >
          Cancel
        </button>
        <button
          ref={confirmRef}
          style={{ background: 'var(--danger)', color: 'var(--danger-text)', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          onClick={onConfirm}
        >
          Confirm
        </button>
      </div>
    </>
  );
}
