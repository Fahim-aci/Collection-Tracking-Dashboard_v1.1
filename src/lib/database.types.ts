// /src/lib/database.types.ts
// ─────────────────────────────────────────────────────────────────────────────
// TypeScript type definitions for the ACI Collection Tracking database v2.
//
// Schema v2 key changes:
//   • collection_periods table REMOVED
//   • collection_records now uses collection_date DATE (not period_id UUID)
//   • SPLY is computed by the application (date - 1 year), not stored as FK
//   • date_locks table added for per-date write protection
//   • All aggregation views replaced by parameterised RPC functions
//
// To auto-regenerate from the live schema:
//   npx supabase gen types typescript --project-id <YOUR_PROJECT_ID>
// ─────────────────────────────────────────────────────────────────────────────

// ── ENUM mirrors ──────────────────────────────────────────────────────────────

export type PaymentModeType = 'Credit' | 'Cash' | 'Deposit';
export type DataSource      = 'manual' | 'csv_import' | 'api';
export type UserRole        = 'admin' | 'editor' | 'viewer';
export type MoverDirection  = 'gainer' | 'decliner' | 'neutral';

// ── Table row shapes ──────────────────────────────────────────────────────────

/** businesses — SBU master / dimension table (unchanged from v1) */
export interface Business {
  id:         string;        // UUID
  name:       string;        // e.g. "ACI Foods Limited"
  short_code: string | null;
  category:   string | null; // e.g. 'FMCG', 'Motors', 'Pharma'
  parent_id:  string | null; // self-referential FK for SBU hierarchy
  is_active:  boolean;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

/** collection_records — core fact table (v2: collection_date replaces period_id) */
export interface CollectionRecord {
  id:                string;
  business_id:       string;
  collection_date:   string;  // 'YYYY-MM-DD' — the actual calendar day
  credit_amount:     number;
  cash_amount:       number;
  deposit_amount:    number;
  total_cash_amount: number;  // generated: cash + deposit
  total_amount:      number;  // generated: credit + cash + deposit
  data_source:       DataSource;
  notes:             string | null;
  created_by:        string | null;
  updated_by:        string | null;
  created_at:        string;
  updated_at:        string;
}

/** user_profiles — extends Supabase auth.users (unchanged from v1) */
export interface UserProfile {
  id:         string;
  full_name:  string | null;
  role:       UserRole;
  department: string | null;
  created_at: string;
  updated_at: string;
}

/** import_logs — audit trail for CSV imports (v2: collection_date replaces period_id) */
export interface ImportLog {
  id:                  string;
  imported_by:         string | null;
  collection_date:     string | null;  // 'YYYY-MM-DD'
  file_name:           string | null;
  row_count:           number | null;
  status:              'success' | 'partial' | 'failed' | null;
  error_details:       unknown;
  skipped_businesses:  string[] | null;
  imported_at:         string;
}

/** date_locks — per-date write protection (replaces is_locked on collection_periods) */
export interface DateLock {
  collection_date: string;   // 'YYYY-MM-DD' — primary key
  locked_by:       string | null;
  locked_at:       string;
  notes:           string | null;
}

// ── business_projections ─────────────────────────────────────────────────────
// Day-wise credit / cash targets per SBU.
// projection_date: the calendar date this projection row applies to.
// Monthly total  = SUM of all rows WHERE projection_date IN that month.
// Fiscal Year total = SUM of all rows WHERE projection_date IN that fiscal year (Jul–Jun).
// cash_target = cash + deposit combined (matches "Cash Total" definition)
//
// UNIQUE (business_id, projection_date)
//
// Schema migration SQL is documented at the bottom of:
//   /src/app/components/projections/ProjectionInputPage.tsx

export interface BusinessProjection {
  id:              string;
  business_id:     string;
  projection_date: string;  // 'YYYY-MM-DD' — the calendar day this row covers
  credit_target:   number;
  cash_target:     number;
  total_target:    number;  // generated column (credit_target + cash_target)
  notes:           string | null;
  created_at:      string;
  updated_at:      string;
}

// ── View row shapes ───────────────────────────────────────────────────────────

/** v_daily_collection — one row per active business per collection_date.
 *  Filter by collection_date range in PostgREST. */
export interface VDailyCollectionRow {
  record_id:         string;
  collection_date:   string;
  fiscal_year:       number;
  fiscal_quarter:    number;
  month_number:      number;
  year_month:        string;
  iso_week:          number;
  day_of_week:       string;
  business_id:       string;
  business_name:     string;
  short_code:        string | null;
  category:          string | null;
  sort_order:        number | null;
  credit_amount:     number;
  cash_amount:       number;
  deposit_amount:    number;
  total_cash_amount: number;
  total_amount:      number;
  data_source:       DataSource;
  notes:             string | null;
  created_at:        string;
  updated_at:        string;
}

/** v_available_dates — one row per collection_date that has data. */
export interface VAvailableDateRow {
  collection_date: string;
  fiscal_year:     number;
  fiscal_quarter:  number;
  month_number:    number;
  month_label:     string;
  sbu_count:       number;
  day_total:       number;
  is_locked:       boolean;
}

// ── RPC return shapes (replaces old views) ────────────────────────────────────

/** Returned by get_collection_summary(date_from, date_to) — one row per SBU.
 *  Replaces VCollectionSummaryRow (v1). */
export interface CollectionSummaryRow {
  record_count:      number;  // number of daily records summed
  business_id:       string;
  business_name:     string;
  short_code:        string | null;
  category:          string | null;
  sort_order:        number | null;
  // Current period amounts (aggregated over date range)
  credit_amount:     number;
  cash_amount:       number;
  deposit_amount:    number;
  total_cash_amount: number;
  total_amount:      number;
  // SPLY amounts (same range, 1 year prior)
  credit_sply:       number | null;
  cash_sply:         number | null;
  deposit_sply:      number | null;
  total_cash_sply:   number | null;
  total_sply:        number | null;
  // Derived
  total_delta:       number | null;
  growth_pct:        number | null;
}

/** Returned by get_period_totals(date_from, date_to) — single aggregate row.
 *  Contains BOTH current and SPLY totals (replaces VPeriodTotalsRow). */
export interface PeriodTotalsRow {
  date_from:              string;
  date_to:                string;
  fiscal_year_start:      number;
  fiscal_year_end:        number;
  sply_from:              string;
  sply_to:                string;
  // Current totals
  total_credit:           number;
  total_cash:             number;
  total_deposit:          number;
  total_cash_and_deposit: number;
  grand_total:            number;
  business_count:         number;
  day_count:              number;
  // SPLY totals
  sply_credit:            number;
  sply_cash:              number;
  sply_deposit:           number;
  sply_grand_total:       number;
  sply_business_count:    number;
  // Growth
  grand_total_delta:      number;
  growth_pct:             number | null;
}

/** Returned by get_payment_mode_split(date_from, date_to) — 3 rows. */
export interface PaymentModeSplitRow {
  payment_mode: PaymentModeType;
  amount:       number;
  pct:          number | null;
}

/** Returned by get_monthly_trend(fy_current) — 12 rows (Jul → Jun). */
export interface MonthlyTrendRow {
  month_number:  number;
  month_label:   string;
  fiscal_year:   number;
  current_total: number;
  sply_total:    number;
}

/** Returned by get_daily_trend(date_from, date_to) — one row per day. */
export interface DailyTrendRow {
  collection_date: string;
  day_label:       string;
  total_credit:    number;
  total_cash:      number;
  total_deposit:   number;
  grand_total:     number;
  sbu_count:       number;
  is_locked:       boolean;
}

/** Returned by get_top_movers(date_from, date_to, top_n). */
export interface TopMoverRow {
  business_id:   string;
  business_name: string;
  category:      string | null;
  total_amount:  number;
  total_sply:    number | null;
  total_delta:   number | null;
  growth_pct:    number | null;
  direction:     MoverDirection;
}

// ── Backwards-compat aliases (for components not yet migrated) ─────────────────
// Remove these once every consumer uses the v2 names.
/** @deprecated Use CollectionSummaryRow */
export type VCollectionSummaryRow = CollectionSummaryRow & {
  record_id: string;
  period_id: string;
  period_label: string;
  fiscal_year: number;
  month_number: number | null;
  period_type: string;
  start_date: string;
  end_date: string;
  is_locked: boolean;
  data_source: DataSource;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
/** @deprecated Use PeriodTotalsRow */
export type VPeriodTotalsRow = PeriodTotalsRow & {
  period_id: string;
  period_label: string;
  month_number: number | null;
  period_type: string;
  start_date: string;
  end_date: string;
  is_locked: boolean;
  total_cash_and_deposit: number;
  grand_total: number;
  business_count: number;
};
/** @deprecated Use PaymentModeSplitRow */
export type VPaymentModeSplitRow = PaymentModeSplitRow & { period_id: string };
/** @deprecated */
export type VTopMoversRow = TopMoverRow & { period_id: string; period_label: string };