interface Props {
  onClick: () => void;
  label?: string; // accessible name; default "Edit"
}

export function EditButton({ onClick, label = 'Edit' }: Props) {
  return (
    <button
      type="button"
      className="btn-icon btn-edit"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <span aria-hidden="true">🖌</span>
    </button>
  );
}
