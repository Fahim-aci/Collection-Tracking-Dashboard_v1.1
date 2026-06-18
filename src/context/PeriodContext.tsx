// /src/context/PeriodContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Active Period Context Provider
//
// Loads all collection_periods rows from Supabase on mount, sorted newest
// first. Selects the most recent unlocked YTD period as the default.
// Exposes:
//   activePeriod    — full CollectionPeriod row (or null while loading)
//   activePeriodId  — UUID string shortcut (null while loading)
//   setActivePeriod — swap to any other period (triggers hook re-fetches)
//   periods         — full list for the TopBar period selector dropdown
//   loading         — true during the initial fetch
//   error           — string if the fetch failed, otherwise null
//
// Usage:
//   Wrap your root component with <PeriodProvider>.
//   Consume with the usePeriod() hook in any child component.
//
// NOTE: In Figma Make, App.tsx IS the root component (there is no main.tsx).
// Wrap the return value of App() with <PeriodProvider> there.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabaseClient';
import type { CollectionPeriod } from '../lib/database.types';

// ── Context shape ─────────────────────────────────────────────────────────────

interface PeriodContextValue {
  /** All available periods, newest first */
  periods: CollectionPeriod[];
  /** The currently selected period (null during initial load) */
  activePeriod: CollectionPeriod | null;
  /** Shortcut UUID — null when activePeriod is null */
  activePeriodId: string | null;
  /** Call this from the period selector dropdown in TopBar */
  setActivePeriod: (period: CollectionPeriod) => void;
  /** True while the initial Supabase fetch is in flight */
  loading: boolean;
  /** Non-null if the fetch failed */
  error: string | null;
}

// ── Context object ────────────────────────────────────────────────────────────

const PeriodContext = createContext<PeriodContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [periods,      setPeriods]      = useState<CollectionPeriod[]>([]);
  const [activePeriod, setActivePeriod] = useState<CollectionPeriod | null>(null);
  const [loading,      setLoading]      = useState<boolean>(true);
  const [error,        setError]        = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPeriods() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('collection_periods')
        .select('*')
        .order('start_date', { ascending: false });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as CollectionPeriod[];
      setPeriods(rows);

      // Default selection: latest unlocked YTD period, then any latest period
      const defaultPeriod =
        rows.find(p => p.period_type === 'ytd' && !p.is_locked) ??
        rows[0] ??
        null;

      setActivePeriod(defaultPeriod);
      setLoading(false);
    }

    loadPeriods();

    return () => {
      cancelled = true;
    };
  }, []);

  const value: PeriodContextValue = {
    periods,
    activePeriod,
    activePeriodId: activePeriod?.id ?? null,
    setActivePeriod,
    loading,
    error,
  };

  return (
    <PeriodContext.Provider value={value}>
      {children}
    </PeriodContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

/**
 * usePeriod()
 * Must be called inside a component that is a descendant of <PeriodProvider>.
 * Throws a descriptive error if used outside the provider tree.
 */
export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) {
    throw new Error(
      'usePeriod() was called outside of <PeriodProvider>. ' +
      'Wrap your root component (App.tsx) with <PeriodProvider>.'
    );
  }
  return ctx;
}
