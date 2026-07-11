// Shown after a database operation (add/update/delete/log) fails, so the
// user knows their action did not take effect. Dismissible — unlike
// ConflictBanner, there's no cross-tab state to reconcile, so no reload is
// required to recover.
export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between',
        background: 'var(--danger-light)', border: '1px solid var(--danger)',
        color: 'var(--danger)', borderRadius: 8, padding: '10px 12px', marginBottom: 12,
        fontSize: 13,
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        className="btn-icon"
        style={{ flexShrink: 0, color: 'var(--danger)' }}
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}
