import { DayNight } from '../types';
import { DAY_NAMES } from '../utils';

export type DayNightValue = typeof DayNight[keyof typeof DayNight];

export function StarToggle({ starred, onToggle, style, size }: {
  starred: boolean;
  onToggle: () => void;
  style?: Record<string, string>;
  size?: 'sm';
}) {
  return (
    <button
      type="button"
      className={'btn-star' + (size === 'sm' ? ' btn-star-sm' : '') + (starred ? ' active' : '')}
      onClick={onToggle}
      title={starred ? 'Starred' : 'Not starred'}
      style={style}
    >
      {starred ? '★' : '☆'}
    </button>
  );
}

export function TitleInput({ value, onChange, placeholder, inputRef, autoFocus }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputRef?: { current: HTMLInputElement | null };
  autoFocus?: boolean;
}) {
  return (
    <div className="form-group grow">
      <label>Title</label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onInput={e => onChange((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
    </div>
  );
}

export function DayNightSelect({ value, onChange, compact }: {
  value: DayNightValue;
  onChange: (v: DayNightValue) => void;
  compact?: boolean;
}) {
  const select = (
    <select
      className={compact ? 'step-day-night' : undefined}
      value={value}
      onChange={e => onChange((e.target as HTMLSelectElement).value as DayNightValue)}
    >
      {compact
        ? <><option value="day">☀️</option><option value="night">🌙</option></>
        : <><option value="day">☀️ Day</option><option value="night">🌙 Night</option></>}
    </select>
  );
  if (compact) return select;
  return (
    <div className="form-group">
      <label>Time</label>
      {select}
    </div>
  );
}

export function ResetsSelect({ value, onChange }: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="form-group">
      <label>Resets</label>
      <select value={value} onChange={e => onChange((e.target as HTMLSelectElement).value)}>
        <option value="daily">Daily</option>
        {DAY_NAMES.map((name, i) => (
          <option key={i} value={i}>Every {name}</option>
        ))}
      </select>
    </div>
  );
}

export function LogModeSelect({ value, onChange }: {
  value: 'today' | 'yesterday';
  onChange: (v: 'today' | 'yesterday') => void;
}) {
  return (
    <div className="form-group">
      <label>Log date</label>
      <select
        value={value}
        onChange={e => onChange((e.target as HTMLSelectElement).value as 'today' | 'yesterday')}
      >
        <option value="today">Today's date</option>
        <option value="yesterday">Yesterday's date</option>
      </select>
    </div>
  );
}
