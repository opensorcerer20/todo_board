import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { sortItems } from '../lib/sorting';
import type { DayDataAdapter } from './types';
import type { Item } from '../lib/sorting';

export function useDayData(adapter: DayDataAdapter) {
  const [items, setItems]   = useState<Item[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<Error | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const [nextItems, nextHabits] = await Promise.all([adapter.getItems(), adapter.getHabits()]);
      if (!mounted.current) return;
      setItems(nextItems);
      setHabits(nextHabits as any);
      setError(null);
    } catch (e) {
      if (mounted.current) setError(e as Error);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [adapter]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    refresh();
    const unsub = adapter.subscribe ? adapter.subscribe(refresh) : undefined;
    return () => {
      mounted.current = false;
      if (unsub) unsub();
    };
  }, [adapter, refresh]);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const optimistic = useCallback(
    async (mutate: (curr: Item[]) => Item[], persist: () => Promise<unknown>) => {
      const prev = itemsRef.current;
      setItems(curr => mutate(curr));
      try {
        await persist();
        if (!adapter.subscribe) refresh();
      } catch (e) {
        setItems(prev);
        setError(e as Error);
      }
    },
    [adapter, refresh],
  );

  const actions = useMemo(() => ({
    addItem: (input: Partial<Item>) =>
      optimistic(
        curr => [...curr, { id: `tmp-${Date.now()}`, deferred: 0, done: false, type: 'task', meta: '', starred: false, ...input, title: input.title ?? '' }],
        () => adapter.addItem(input),
      ),
    toggleDone: (id: string | number, done: boolean) =>
      optimistic(
        curr => curr.map(it => it.id === id ? { ...it, done } : it),
        () => adapter.setDone(id, done),
      ),
    defer: (id: string | number) =>
      optimistic(
        curr => curr.map(it => it.id === id ? { ...it, deferred: (it.deferred || 0) + 1 } : it),
        () => adapter.deferItem(id),
      ),
    logProgress: (id: string | number, note?: string) => adapter.logProgress(id, note),
    logHabit: async (id: string | number) => {
      setHabits(curr => (curr as any[]).map((h: any) => h.id === id ? { ...h, logs: (h.logs ?? 0) + 1, daysSinceLast: 0 } : h) as any);
      try {
        await adapter.logHabit(id);
        if (!adapter.subscribe) refresh();
      } catch (e) {
        setError(e as Error);
        refresh();
      }
    },
  }), [adapter, optimistic, refresh]);

  const sortedItems = useMemo(() => sortItems(items), [items]);
  const openCount = items.filter(it => !it.done).length;
  const doneCount = items.filter(it => it.done).length;

  return { items: sortedItems, habits, openCount, doneCount, loading, error, actions, refresh };
}
