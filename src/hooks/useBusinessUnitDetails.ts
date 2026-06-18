// /src/hooks/useBusinessUnitDetails.ts
// ─────────────────────────────────────────────────────────────────────────────
// Fetches current period + SPLM (same period last month) + SPLY (from RPC)
// for the Business Unit Details table in the Collections view.
//
// SPLY is returned directly by get_collection_summary.
// SPLM is a separate RPC call with dates shifted back 1 month.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useCollectionSummary } from './useCollectionSummary';
import { getSplmRange, type DateRange } from '../lib/datePresets';
import type { CollectionSummaryRow } from '../lib/database.types';

export interface BusinessUnitDetailRow extends CollectionSummaryRow {
  // SPLM fields (null if no SPLM data for this SBU)
  splm_credit:  number | null;
  splm_cash:    number | null;   // cash + deposit (SPLM period)
  splm_total:   number | null;

  // Computed growth ratios (current / previous); null if prev = 0
  growth_splm_credit:  number | null;
  growth_splm_cash:    number | null;   // based on total_cash_amount vs splm_cash
  growth_splm_total:   number | null;

  growth_sply_credit:  number | null;
  growth_sply_cash:    number | null;   // based on total_cash_amount vs total_cash_sply
  growth_sply_total:   number | null;
}

function ratio(current: number, prev: number | null | undefined): number | null {
  if (!prev || prev === 0) return null;
  return current / prev;
}

export function useBusinessUnitDetails(
  dateRange: DateRange,
): {
  rows:    BusinessUnitDetailRow[];
  loading: boolean;
  error:   string | null;
} {
  // ── 1. Current period (also returns SPLY fields) ───────────────────────────
  const {
    rows:    currentRows,
    loading: currentLoading,
    error:   currentError,
  } = useCollectionSummary(dateRange.dateFrom, dateRange.dateTo);

  // ── 2. SPLM period ─────────────────────────────────────────────────────────
  const splmRange = useMemo(() => getSplmRange(dateRange), [dateRange]);
  const {
    rows:    splmRows,
    loading: splmLoading,
    error:   splmError,
  } = useCollectionSummary(splmRange.dateFrom, splmRange.dateTo);

  // ── 3. Merge ───────────────────────────────────────────────────────────────
  const rows = useMemo<BusinessUnitDetailRow[]>(() => {
    const splmMap = new Map(splmRows.map(r => [r.business_id, r]));

    return currentRows.map(r => {
      const splm = splmMap.get(r.business_id);

      const splmCredit  = splm?.credit_amount  ?? null;
      const splmTotal   = splm?.total_amount   ?? null;

      return {
        ...r,

        // SPLM values
        splm_credit: splmCredit,
        splm_cash:   splm?.total_cash_amount ?? null,  // cash + deposit
        splm_total:  splmTotal,

        // Growth vs SPLM
        growth_splm_credit: ratio(r.credit_amount,      splmCredit),
        growth_splm_cash:   ratio(r.total_cash_amount,  splm?.total_cash_amount ?? null),
        growth_splm_total:  ratio(r.total_amount,       splmTotal),

        // Growth vs SPLY
        growth_sply_credit: ratio(r.credit_amount,     r.credit_sply),
        growth_sply_cash:   ratio(r.total_cash_amount, r.total_cash_sply),
        growth_sply_total:  ratio(r.total_amount,      r.total_sply),
      };
    });
  }, [currentRows, splmRows]);

  return {
    rows,
    loading: currentLoading || splmLoading,
    error:   currentError || splmError,
  };
}