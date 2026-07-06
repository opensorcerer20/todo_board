export interface Item {
  id: string | number;
  title: string;
  type: string;
  meta: string;
  deferred: number;
  starred: boolean;
  done: boolean;
}

export function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (!!a.done !== !!b.done) return (a.done ? 1 : 0) - (b.done ? 1 : 0);
    if (!!b.starred !== !!a.starred) return (b.starred ? 1 : 0) - (a.starred ? 1 : 0);
    return (b.deferred || 0) - (a.deferred || 0);
  });
}
