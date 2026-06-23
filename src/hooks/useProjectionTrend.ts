// /src/hooks/useProjectionTrend.ts
// ─────────────────────────────────────────────────────────────────────────────
// Fetches day-by-day Actual / Projection / SPLY totals for the Projection
// trend chart.  When businessIds is empty all SBUs are included.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface TrendPoint {
  date:          string;   // 'YYYY-MM-DD'
  label:         string;   // 'DD-Mon' for display
  actual_total:  number;
  actual_credit: number;
  actual_cash:   number;
  proj_total:    number | null;
  proj_credit:   number | null;
  proj_cash:     number | null;
  splm_total:    number | null;
  splm_credit:   number | null;
  splm_cash:     number | null;
  sply_total:    number | null;
  sply_credit:   number | null;
  sply_cash:     number | null;
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtLabel(d: string): string {
  const [, mo, dy] = d.split('-');
  return `${parseInt(dy)}-${MONTH_SHORT[parseInt(mo) - 1]}`;
}

function shiftYear(d: string, delta: number): string {
  const dt = new Date(d);
  dt.setFullYear(dt.getFullYear() + delta);
  return dt.toISOString().slice(0, 10);
}

function shiftMonth(d: string, delta: number): string {
  const dt = new Date(d);
  dt.setMonth(dt.getMonth() + delta);
  return dt.toISOString().slice(0, 10);
}

type DayAgg = { credit: number; cash: number; total: number };

function aggregate(
  rows: { date: string; credit: number; cash: number; total: number }[],
): Map<string, DayAgg> {
  const m = new Map<string, DayAgg>();
  for (const r of rows) {
    const e = m.get(r.date) ?? { credit: 0, cash: 0, total: 0 };
    m.set(r.date, {
      credit: e.credit + r.credit,
      cash:   e.cash   + r.cash,
      total:  e.total  + r.total,
    });
  }
  return m;
}

export function useProjectionTrend(
  dateFrom:    string | null,
  dateTo:      string | null,
  businessIds: string[],      // empty = all SBUs, populated = category filter
): { data: TrendPoint[]; loading: boolean; error: string | null } {
  const [data,    setData]    = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Stable dependency key so the effect re-runs only when IDs actually change
  const idKey = businessIds.slice().sort().join(',');

  useEffect(() => {
    if (!dateFrom || !dateTo) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const splyFrom    = shiftYear(dateFrom,  -1);
    const splyTo      = shiftYear(dateTo,    -1);
    const splmFrom    = shiftMonth(dateFrom, -1);
    const splmTo      = shiftMonth(dateTo,   -1);
    const filterIds   = businessIds.length > 0;

    async function run() {
      // ── Build Supabase queries ────────────────────────────────────────────
      let actualQ = supabase
        .from('collection_records')
        .select('collection_date, credit_amount, total_cash_amount, total_amount')
        .gte('collection_date', dateFrom!)
        .lte('collection_date', dateTo!);

      let projQ = supabase
        .from('business_projections')
        .select('projection_date, credit_target, cash_target, total_target')
        .gte('projection_date', dateFrom!)
        .lte('projection_date', dateTo!);

      let splmQ = supabase
        .from('collection_records')
        .select('collection_date, credit_amount, total_cash_amount, total_amount')
        .gte('collection_date', splmFrom)
        .lte('collection_date', splmTo);

      let splyQ = supabase
        .from('collection_records')
        .select('collection_date, credit_amount, total_cash_amount, total_amount')
        .gte('collection_date', splyFrom)
        .lte('collection_date', splyTo);

      if (filterIds) {
        actualQ = actualQ.in('business_id', businessIds);
        projQ   = projQ.in('business_id', businessIds);
        splmQ   = splmQ.in('business_id', businessIds);
        splyQ   = splyQ.in('business_id', businessIds);
      }

      const [aRes, pRes, mRes, sRes] = await Promise.all([actualQ, projQ, splmQ, splyQ]);
      if (cancelled) return;
      if (aRes.error) throw new Error(`Actual fetch: ${aRes.error.message}`);

      // ── Aggregate by date ─────────────────────────────────────────────────
      const actualMap = aggregate(
        (aRes.data ?? []).map(r => ({
          date:   r.collection_date,
          credit: Number(r.credit_amount),
          cash:   Number(r.total_cash_amount),
          total:  Number(r.total_amount),
        })),
      );

      const projMap = aggregate(
        (pRes.data ?? []).map(r => ({
          date:   r.projection_date,
          credit: Number(r.credit_target),
          cash:   Number(r.cash_target),
          total:  Number(r.total_target),
        })),
      );

      // SPLM dates shifted forward 1 month to align on the x-axis.
      const splmMap = aggregate(
        (mRes.data ?? []).map(r => ({
          date:   shiftMonth(r.collection_date, 1),
          credit: Number(r.credit_amount),
          cash:   Number(r.total_cash_amount),
          total:  Number(r.total_amount),
        })),
      );

      // SPLY dates are shifted forward 1 year so they align with the current
      // period on the x-axis (same calendar position, prior year value).
      const splyMap = aggregate(
        (sRes.data ?? []).map(r => ({
          date:   shiftYear(r.collection_date, 1),
          credit: Number(r.credit_amount),
          cash:   Number(r.total_cash_amount),
          total:  Number(r.total_amount),
        })),
      );

      // ── Build one point per calendar day in [dateFrom, dateTo] ───────────
      const points: TrendPoint[] = [];
      const cur = new Date(dateFrom!);
      const end = new Date(dateTo!);
      while (cur <= end) {
        const d = cur.toISOString().slice(0, 10);
        const a = actualMap.get(d);
        const p = projMap.get(d);
        const m = splmMap.get(d);
        const s = splyMap.get(d);
        points.push({
          date:          d,
          label:         fmtLabel(d),
          actual_total:  a?.total  ?? 0,
          actual_credit: a?.credit ?? 0,
          actual_cash:   a?.cash   ?? 0,
          proj_total:    p ? (p.total)  : null,
          proj_credit:   p ? (p.credit) : null,
          proj_cash:     p ? (p.cash)   : null,
          splm_total:    m ? (m.total)  : null,
          splm_credit:   m ? (m.credit) : null,
          splm_cash:     m ? (m.cash)   : null,
          sply_total:    s ? (s.total)  : null,
          sply_credit:   s ? (s.credit) : null,
          sply_cash:     s ? (s.cash)   : null,
        });
        cur.setDate(cur.getDate() + 1);
      }

      setData(points);
      setLoading(false);
    }

    run().catch(err => {
      if (!cancelled) {
        console.error('[useProjectionTrend]', err);
        setError(String(err));
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, idKey]);

  return { data, loading, error };
}
