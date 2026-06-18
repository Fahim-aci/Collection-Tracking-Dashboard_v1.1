// /src/hooks/usePaymentModeSplit.ts
// ─────────────────────────────────────────────────────────────────────────────
// Calls get_payment_mode_split(date_from, date_to) Supabase RPC.
// Returns 3 rows: Credit / Cash / Deposit with amounts and percentage share.
// Used by: ProjectionVsCollection (future donut chart upgrade)
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { PaymentModeSplitRow } from '../lib/database.types';

export interface PaymentModeSplitResult {
  rows:    PaymentModeSplitRow[];
  loading: boolean;
  error:   string | null;
}

export function usePaymentModeSplit(
  dateFrom: string | null,
  dateTo:   string | null,
): PaymentModeSplitResult {
  const [rows,    setRows]    = useState<PaymentModeSplitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      const { data, error: rpcErr } = await supabase
        .rpc('get_payment_mode_split', {
          p_date_from: dateFrom,
          p_date_to:   dateTo,
        });

      if (!cancelled) {
        if (rpcErr) setError(rpcErr.message);
        else        setRows((data ?? []) as PaymentModeSplitRow[]);
        setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  return { rows, loading, error };
}
