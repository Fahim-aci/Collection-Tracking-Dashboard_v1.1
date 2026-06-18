// /src/hooks/useCollectionSummary.ts
// ─────────────────────────────────────────────────────────────────────────────
// Calls the get_collection_summary(date_from, date_to) Supabase RPC.
// Returns one row per active SBU with current + SPLY aggregates and growth %.
//
// SPLY is automatically computed by the RPC function (shifts date range back
// 1 year) — no period IDs or period table required.
//
// Used by: CollectionTable, Top10Businesses, PortfolioCollections,
//          PerformanceStats
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { CollectionSummaryRow } from '../lib/database.types';

export interface CollectionSummaryResult {
  /** All active SBU rows sorted by total_amount DESC */
  rows:    CollectionSummaryRow[];
  /** First 10 rows — ready for Top10Businesses without extra slicing */
  top10:   CollectionSummaryRow[];
  loading: boolean;
  error:   string | null;
}

export function useCollectionSummary(
  dateFrom: string | null,
  dateTo:   string | null,
): CollectionSummaryResult {
  const [rows,    setRows]    = useState<CollectionSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setRows([]);

    async function fetchData() {
      const { data, error: rpcErr } = await supabase
        .rpc('get_collection_summary', {
          p_date_from: dateFrom,
          p_date_to:   dateTo,
        });

      if (!cancelled) {
        if (rpcErr) {
          setError(rpcErr.message);
        } else {
          setRows((data ?? []) as CollectionSummaryRow[]);
        }
        setLoading(false);
      }
    }

    fetchData();

    // Realtime: re-fetch when any collection_records row changes.
    // No date-range filter on the subscription (Realtime doesn't support
    // range ops); we just invalidate and re-query.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase.channel(`collection-summary-${crypto.randomUUID()}`);
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'collection_records' },
          () => { fetchData(); },
        );
      channel.subscribe();
    } catch (err) {
      console.warn('[useCollectionSummary] Realtime subscription failed (non-fatal):', err);
    }

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [dateFrom, dateTo]);

  const top10 = rows.slice(0, 10);
  return { rows, top10, loading, error };
}
