import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { ConflictError } from '../db';
import { ConflictBanner } from './ConflictBanner';

/**
 * Shared scaffolding for the three edit modals: backdrop + card, header,
 * Escape-to-close, first-input focus, conflict handling, and the Cancel/Save
 * footer. Each caller supplies its own field inputs as `children` and an
 * `onSubmit` that builds its patch and persists it (may throw ConflictError).
 */
export function EditModalShell({
  title,
  large,
  canSubmit = true,
  onSubmit,
  onClose,
  onSaveError,
  children,
}: {
  title: string;
  large?: boolean;
  canSubmit?: boolean;
  onSubmit: () => Promise<void>;
  onClose: () => void;
  onSaveError?: (err: unknown) => void;
  children: ComponentChildren;
}) {
  const [conflict, setConflict] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Focus + select the first text input — the title field in every modal.
    const first = formRef.current?.querySelector('input[type="text"]') as HTMLInputElement | null;
    first?.focus();
    first?.select();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function submit(e: Event) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await onSubmit();
    } catch (err) {
      if (err instanceof ConflictError) setConflict(true);
      else if (onSaveError) onSaveError(err);
      else console.error('EditModalShell: unhandled save error (no onSaveError provided)', err);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={'modal-card' + (large ? ' modal-card-lg' : '')} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        {conflict && <ConflictBanner />}
        <form ref={formRef} onSubmit={submit}>
          {children}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn" onClick={onClose} style={{ background: 'var(--bg)', color: 'var(--text)' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
