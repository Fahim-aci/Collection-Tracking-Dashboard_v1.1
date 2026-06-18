// /src/lib/datePresets.ts
// ─────────────────────────────────────────────────────────────────────────────
// Computes date_from / date_to pairs for every dashboard filter preset.
// ACI Group fiscal year: July 1 → June 30.
// All dates returned as 'YYYY-MM-DD' strings (Supabase-safe).
// ─────────────────────────────────────────────────────────────────────────────

export type PresetKey =
  | 'today' | 'yesterday'
  | 'wtd' | 'mtd' | 'qtd' | 'ytd'
  | 'last7' | 'last30' | 'last90'
  | 'custom';

export interface DateRange {
  dateFrom: string;  // 'YYYY-MM-DD'
  dateTo:   string;  // 'YYYY-MM-DD'
}

export const PRESET_LABELS: Record<PresetKey, string> = {
  today:     'Today',
  yesterday: 'Yesterday',
  wtd:       'WTD',
  mtd:       'MTD',
  qtd:       'QTD',
  ytd:       'YTD',
  last7:     'Last 7D',
  last30:    'Last 30D',
  last90:    'Last 90D',
  custom:    'Custom',
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** ACI fiscal year that contains d. FY2025 = Jul 2024 – Jun 2025. */
export function fiscalYear(d: Date): number {
  return d.getMonth() >= 6 ? d.getFullYear() + 1 : d.getFullYear();
}

/** First day of the fiscal year that contains d. */
function fyStart(d: Date): Date {
  return new Date(fiscalYear(d) - 1, 6, 1); // July 1 of (fy - 1)
}

/** First day of the current fiscal quarter containing d.
 *  Q1=Jul–Sep | Q2=Oct–Dec | Q3=Jan–Mar | Q4=Apr–Jun */
function fqStart(d: Date): Date {
  const m = d.getMonth(); // 0-based
  if (m >= 6 && m <= 8)  return new Date(d.getFullYear(), 6, 1);   // Jul
  if (m >= 9 && m <= 11) return new Date(d.getFullYear(), 9, 1);   // Oct
  if (m >= 0 && m <= 2)  return new Date(d.getFullYear(), 0, 1);   // Jan
  return new Date(d.getFullYear(), 3, 1);                           // Apr
}

/** Most recent Saturday on or before d (ACI week starts Saturday). */
function weekStart(d: Date): Date {
  const dow  = d.getDay(); // 0=Sun … 6=Sat
  const diff = -((dow - 6 + 7) % 7);
  const sat  = new Date(d);
  sat.setDate(d.getDate() + diff);
  return sat;
}

/** Subtract exactly 1 year (handles leap years). */
export function minusOneYear(d: Date): Date {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() - 1);
  return r;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Compute a date range from a preset key. */
export function getPresetRange(
  preset: PresetKey,
  customFrom?: string,
  customTo?:   string,
): DateRange {
  const t = today();

  switch (preset) {

    case 'today':
      return { dateFrom: toISO(t), dateTo: toISO(t) };

    case 'yesterday': {
      const y = new Date(t);
      y.setDate(t.getDate() - 1);
      return { dateFrom: toISO(y), dateTo: toISO(y) };
    }

    case 'wtd':
      return { dateFrom: toISO(weekStart(t)), dateTo: toISO(t) };

    case 'mtd': {
      const mStart = new Date(t.getFullYear(), t.getMonth(), 1);
      return { dateFrom: toISO(mStart), dateTo: toISO(t) };
    }

    case 'qtd':
      return { dateFrom: toISO(fqStart(t)), dateTo: toISO(t) };

    case 'ytd':
      return { dateFrom: toISO(fyStart(t)), dateTo: toISO(t) };

    case 'last7': {
      const f = new Date(t);
      f.setDate(t.getDate() - 6);
      return { dateFrom: toISO(f), dateTo: toISO(t) };
    }

    case 'last30': {
      const f = new Date(t);
      f.setDate(t.getDate() - 29);
      return { dateFrom: toISO(f), dateTo: toISO(t) };
    }

    case 'last90': {
      const f = new Date(t);
      f.setDate(t.getDate() - 89);
      return { dateFrom: toISO(f), dateTo: toISO(t) };
    }

    case 'custom':
      return {
        dateFrom: customFrom ?? toISO(fyStart(t)),
        dateTo:   customTo   ?? toISO(t),
      };

    default:
      return { dateFrom: toISO(fyStart(t)), dateTo: toISO(t) };
  }
}

/** Shift a DateRange back exactly 1 calendar month to get the SPLM window. */
export function getSplmRange(range: DateRange): DateRange {
  const shiftBack = (dateStr: string): string => {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() - 1);
    return toISO(d);
  };
  return {
    dateFrom: shiftBack(range.dateFrom),
    dateTo:   shiftBack(range.dateTo),
  };
}

/** Shift a DateRange back exactly 1 fiscal year to get the SPLY window. */
export function getSplyRange(range: DateRange): DateRange {
  return {
    dateFrom: toISO(minusOneYear(new Date(range.dateFrom))),
    dateTo:   toISO(minusOneYear(new Date(range.dateTo))),
  };
}

/** Human-readable label for a DateRange. */
export function formatRangeLabel(range: DateRange): string {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const f = new Date(range.dateFrom).toLocaleDateString('en-GB', opts);
  const t = new Date(range.dateTo).toLocaleDateString('en-GB',   opts);
  return range.dateFrom === range.dateTo ? f : `${f} – ${t}`;
}

/** Derive the fiscal year from a 'YYYY-MM-DD' date string. */
export function fiscalYearFromDateStr(dateStr: string): number {
  return fiscalYear(new Date(dateStr));
}