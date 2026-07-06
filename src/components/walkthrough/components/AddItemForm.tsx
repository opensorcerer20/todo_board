import { useState } from 'preact/hooks';
import { theme } from '../theme';

export function AddItemForm({ onAdd }: { onAdd: (input: { title: string }) => void }) {
  const [draft, setDraft] = useState('');

  const submit = (e: Event) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    onAdd({ title });
    setDraft('');
  };

  return (
    <form
      onSubmit={submit}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        background: '#101319', border: '1px dashed #2a3039',
        borderRadius: 13, padding: '8px 8px 8px 16px',
      }}
    >
      <span style={{ color: '#5a6273', fontSize: 17, lineHeight: 1, flexShrink: 0 }}>＋</span>
      <input
        value={draft}
        onInput={e => setDraft((e.target as HTMLInputElement).value)}
        placeholder="Add something to today…"
        style={{
          flex: 1, minWidth: 0, background: 'transparent', border: 'none',
          outline: 'none', color: theme.color.text, fontFamily: theme.font.sans,
          fontSize: 14.5, padding: '6px 0',
        }}
      />
      <button
        type="submit"
        style={{
          background: '#232833', color: '#cfd5e2', fontFamily: theme.font.sans,
          fontSize: 13, fontWeight: 600, border: '1px solid #333a47',
          padding: '9px 16px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Add
      </button>
    </form>
  );
}
