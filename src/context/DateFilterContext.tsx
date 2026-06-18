// /src/context/DateFilterContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Global date-filter context — replaces PeriodContext (v1).
//
// The entire dashboard is now scoped to a { dateFrom, dateTo } date range
// instead of a collection_periods UUID. All aggregations are computed on the
// fly by Supabase RPC functions.
//
// Default preset: 'ytd' (Jul 1 of current fiscal year → today).
//
// Usage:
//   Wrap App with <DateFilterProvider>.
//   Consume with useDateFilter() in any child component.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  getPresetRange,
  formatRangeLabel,
  fiscalYearFromDateStr,
  type PresetKey,
  type DateRange,
} from '../lib/datePresets';

// ── Context shape ─────────────────────────────────────────────────────────────

interface DateFilterContextValue {
  /** Active preset key (e.g. 'ytd', 'mtd', 'custom') */
  preset:     PresetKey;
  /** Resolved { dateFrom, dateTo } pair */
  dateRange:  DateRange;
  /** Fiscal year derived from dateTo */
  fiscalYear: number;
  /** Human-readable label for the active range */
  rangeLabel: string;
  /** Switch to a named preset — updates dateRange automatically */
  setPreset:  (p: PresetKey) => void;
  /** Switch to a custom range — sets preset to 'custom' */
  setCustomRange: (from: string, to: string) => void;
}

// ── Context object ────────────────────────────────────────────────────────────

const DateFilterContext = createContext<DateFilterContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

const DEFAULT_PRESET: PresetKey = 'ytd';

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const [preset,    setPresetState] = useState<PresetKey>(DEFAULT_PRESET);
  const [dateRange, setDateRange]   = useState<DateRange>(getPresetRange(DEFAULT_PRESET));

  const setPreset = useCallback((p: PresetKey) => {
    setPresetState(p);
    if (p !== 'custom') {
      setDateRange(getPresetRange(p));
    }
  }, []);

  const setCustomRange = useCallback((from: string, to: string) => {
    setPresetState('custom');
    setDateRange({ dateFrom: from, dateTo: to });
  }, []);

  const value: DateFilterContextValue = {
    preset,
    dateRange,
    fiscalYear: fiscalYearFromDateStr(dateRange.dateTo),
    rangeLabel: formatRangeLabel(dateRange),
    setPreset,
    setCustomRange,
  };

  return (
    <DateFilterContext.Provider value={value}>
      {children}
    </DateFilterContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

export function useDateFilter(): DateFilterContextValue {
  const ctx = useContext(DateFilterContext);
  if (!ctx) {
    throw new Error(
      'useDateFilter() was called outside of <DateFilterProvider>. ' +
      'Wrap your root component (App.tsx) with <DateFilterProvider>.'
    );
  }
  return ctx;
}
