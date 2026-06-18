// /src/hooks/useTopMovers.ts
// ─────────────────────────────────────────────────────────────────────────────
// Calls get_top_movers(date_from, date_to, top_n) Supabase RPC.
// Returns sorted gainers and decliners by absolute delta vs the SPLY window.
// Used by: any future Gainers / Decliners widget
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { TopMoverRow } from '../lib/database.types';

export interface TopMoversResult {
  gainers:   TopMoverRow[];
  decliners: TopMoverRow[];
  loading:   boolean;
  error:     string | null;
}

export function useTopMovers(
  dateFrom: string | null,
  dateTo:   string | null,
  limit = 10,
): TopMoversResult {
  const [gainers,   setGainers]   = useState<TopMoverRow[]>([]);
  const [decliners, setDecliners] = useState<TopMoverRow[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      const { data, error: rpcErr } = await supabase
        .rpc('get_top_movers', {
          p_date_from: dateFrom,
          p_date_to:   dateTo,
          p_top_n:     limit,
        });

      if (!cancelled) {
        if (rpcErr) {
          setError(rpcErr.message);
        } else {
          const all = (data ?? []) as TopMoverRow[];
          setGainers(  all.filter(r => r.direction === 'gainer'));
          setDecliners(all.filter(r => r.direction === 'decliner'));
        }
        setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, limit]);

  return { gainers, decliners, loading, error };
}
