// /src/hooks/useMonthlyTrend.ts
// ─────────────────────────────────────────────────────────────────────────────
// Calls get_monthly_trend(p_fy_current) Supabase RPC.
// Returns 12 data points (Jul → Jun) with current and SPLY monthly totals.
//
// No longer queries collection_periods or v_period_totals.
// The RPC aggregates collection_records by calendar month within the fiscal year.
//
// Used by: PerformanceStats
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { MonthlyTrendRow } from '../lib/database.types';

export interface MonthlyTrendPoint {
  /** Short month name, e.g. "Jul" */
  month:   string;
  /** Grand total for this month in the requested fiscal year */
  current: number;
  /** Grand total for same month in prior fiscal year */
  sply:    number;
}

export interface MonthlyTrendResult {
  data:    MonthlyTrendPoint[];
  loading: boolean;
  error:   string | null;
}

export function useMonthlyTrend(fiscalYear: number): MonthlyTrendResult {
  const [data,    setData]    = useState<MonthlyTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      const { data: rows, error: rpcErr } = await supabase
        .rpc('get_monthly_trend', { p_fy_current: fiscalYear });

      if (cancelled) return;

      if (rpcErr) {
        setError(rpcErr.message);
        setLoading(false);
        return;
      }

      // Map RPC rows to the chart-friendly MonthlyTrendPoint shape.
      // The RPC already returns rows in fiscal order (Jul → Jun).
      const points: MonthlyTrendPoint[] = ((rows ?? []) as MonthlyTrendRow[]).map(r => ({
        month:   r.month_label,
        current: r.current_total,
        sply:    r.sply_total,
      }));

      setData(points);
      setLoading(false);
    }

    fetchData();

    return () => { cancelled = true; };
  }, [fiscalYear]);

  return { data, loading, error };
}
