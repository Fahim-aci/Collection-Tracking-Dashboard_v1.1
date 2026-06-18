// /src/hooks/usePeriodTotals.ts
// ─────────────────────────────────────────────────────────────────────────────
// Calls get_period_totals(date_from, date_to) Supabase RPC.
// Returns a single aggregate row with current AND SPLY grand totals + growth %.
//
// SPLY is computed inside the RPC (date range − 1 year) — no period FKs.
//
// Used by: KpiCards, ProjectionVsCollection
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { PeriodTotalsRow } from '../lib/database.types';

export interface PeriodTotalsResult {
  /** Combined current + SPLY totals for the date range (null while loading) */
  totals:  PeriodTotalsRow | null;
  loading: boolean;
  error:   string | null;
}

export function usePeriodTotals(
  dateFrom: string | null,
  dateTo:   string | null,
): PeriodTotalsResult {
  const [totals,  setTotals]  = useState<PeriodTotalsRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setTotals(null);

    async function fetchData() {
      const { data, error: rpcErr } = await supabase
        .rpc('get_period_totals', {
          p_date_from: dateFrom,
          p_date_to:   dateTo,
        })
        .single();

      if (!cancelled) {
        if (rpcErr) {
          setError(rpcErr.message);
        } else {
          setTotals(data as PeriodTotalsRow);
        }
        setLoading(false);
      }
    }

    fetchData();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase.channel(`period-totals-${crypto.randomUUID()}`);
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'collection_records' },
          () => { fetchData(); },
        );
      channel.subscribe();
    } catch (err) {
      console.warn('[usePeriodTotals] Realtime subscription failed (non-fatal):', err);
    }

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [dateFrom, dateTo]);

  return { totals, loading, error };
}
