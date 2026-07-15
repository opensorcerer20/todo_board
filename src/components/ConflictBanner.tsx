// Shown in an edit modal when the record changed in another tab while the
// modal was open. The user must reload to pull the latest version.
export function ConflictBanner() {
  return (
    <div
      role="alert"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between',
        background: 'var(--danger)', border: '1px solid var(--danger)',
        color: 'var(--danger-text)', borderRadius: 8, padding: '10px 12px', marginBottom: 12,
        fontSize: 13,
      }}
    >
      <span>
        This item was changed in another tab. Refresh the page to load the latest
        version, then re-apply your change.
      </span>
      <button
        type="button"
        className="btn btn-primary"
        style={{ flexShrink: 0 }}
        onClick={() => location.reload()}
      >
        Refresh page
      </button>
    </div>
  );
}
