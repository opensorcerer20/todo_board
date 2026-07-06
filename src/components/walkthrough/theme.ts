export const theme = {
  font: {
    sans: "'Hanken Grotesk', system-ui, -apple-system, sans-serif",
    mono: "'Space Mono', ui-monospace, monospace",
  },
  color: {
    bg: '#0d0f13',
    card: '#14161b',
    cardBorder: '#222831',
    divider: '#1f242c',
    text: '#e3e6ee',
    textStrong: '#eef0f5',
    textMuted: '#7e879c',
    textFaint: '#6f7686',
    star: '#d8a85a',
    good: '#5f8f74',
    goodText: '#7fb295',
    accent: '#7d8cc4',
  },
  badge: {
    task:    { bg: '#232833', fg: '#9aa6cf', label: 'Task' },
    errand:  { bg: '#2c2620', fg: '#cf9f54', label: 'Errand' },
    project: { bg: '#1f2a2e', fg: '#7fa6c4', label: 'Project' },
    request: { bg: '#262030', fg: '#b6a6e0', label: 'Request' },
  },
} as const;

export function deferColor(filled: number): string {
  if (filled >= 4) return '#d98a6a';
  if (filled >= 3) return '#cf9f54';
  if (filled >= 1) return '#9aa6cf';
  return '#3c424f';
}

export const healthStyle: Record<string, { color: string; bg: string }> = {
  frequent: { color: '#7fb295', bg: '#16241b' },
  often:    { color: '#9ab48a', bg: '#1c2419' },
  rarely:   { color: '#cf9f54', bg: '#251f16' },
  stale:    { color: '#9aa2b1', bg: '#1c2026' },
};
