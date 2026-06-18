// /src/hooks/usePortfolios.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure computation hook — no Supabase calls.
// Accepts CollectionSummaryRow[] from useCollectionSummary (v2 RPC shape)
// and aggregates them into the 5 ACI portfolio groups using useMemo.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import type { CollectionSummaryRow } from '../lib/database.types';

// ── Portfolio types ───────────────────────────────────────────────────────────

export interface Portfolio {
  id:        string;
  name:      string;
  subtitle:  string;
  color:     string;
  bgColor:   string;
  initials:  string;
  /** SBU business_names that belong to this portfolio */
  members:   string[];
  /** Current period total (Tk millions) — computed from live rows */
  total:     number;
  /** SPLY total (Tk millions) — computed from live rows */
  totalSPLY: number;
  /** Growth % vs SPLY — 0 when SPLY is zero or missing */
  growthPct: number;
}

// ── Static portfolio definitions (style + membership) ────────────────────────

/**
 * PORTFOLIO_DEFS
 * The visual and membership configuration for each portfolio group.
 * Exported so PerformanceStats.tsx can look up members for filtering.
 */
export const PORTFOLIO_DEFS: Omit<Portfolio, 'total' | 'totalSPLY' | 'growthPct'>[] = [
  {
    id:       'pharma',
    name:     'ACI Pharma',
    subtitle: 'Local | HCE | NDDS | Lab EQ',
    color:    '#00A65D',
    bgColor:  '#ECFDF3',
    initials: 'ACI',
    members: [
      'Pharmaceuticals',
      'Ndds',
      'HealthCare Equipment',
      'Lab Equipment & Accessories',
      'ACI Formulations',
    ],
  },
  {
    id:       'agribusiness',
    name:     'ACI Agribusiness',
    subtitle: 'Including Motors',
    color:    '#66B663',
    bgColor:  '#F0FDF4',
    initials: 'AG',
    members: [
      'Field Crops',
      'Fertilizer',
      'Vegetables',
      'Harvester',
      'Power Tiller',
      'Spare - Tractor',
      'ACI Animal Genetics',
      'Animal Health',
      'FOTON',
      'Mahindra',
    ],
  },
  {
    id:       'yamaha',
    name:     'ACI Yamaha',
    subtitle: 'Motorcycles & Parts',
    color:    '#E91922',
    bgColor:  '#FEF3F2',
    initials: 'YM',
    members: [
      'Yamaha Motorcycles',
      'Yamaha Spare Parts',
      'Yamaha Apparels',
      'Yamaha Music',
    ],
  },
  {
    id:       'consumer',
    name:     'ACI Consumer',
    subtitle: 'FMCG & Hygiene',
    color:    '#465FFF',
    bgColor:  '#EEF2FF',
    initials: 'CN',
    members: [
      'Consumer',
      'Hygiene',
      'ACI Foods Limited',
      'ACI Foods Limited (Rice Unit)',
      'ACI Edible Oils Limited',
      'ACI Pure Flour Limited',
      'ACI Salt Limited',
      'Beverage',
      'Flora',
    ],
  },
  {
    id:       'motors',
    name:     'ACI Motors',
    subtitle: 'Vehicles & Spares',
    color:    '#F79009',
    bgColor:  '#FFFAEB',
    initials: 'MT',
    members: [
      'ACI Motors Limited',
      'ACI Motors Service income',
      'CEAT Tyre',
      'Spare Parts',
      'Tire',
      'Liqui Moly',
      'Lube Oil',
    ],
  },
];

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * usePortfolios(rows)
 * Takes the full v_collection_summary rows for the active period and
 * returns 5 Portfolio objects with live totals and growth percentages.
 * Result is memoised — only recomputed when the rows reference changes.
 */
export function usePortfolios(rows: CollectionSummaryRow[]): Portfolio[] {
  return useMemo(() => {
    return PORTFOLIO_DEFS.map(def => {
      const memberRows = rows.filter(r => def.members.includes(r.business_name));

      const total     = memberRows.reduce((sum, r) => sum + (r.total_amount ?? 0), 0);
      const totalSPLY = memberRows.reduce((sum, r) => sum + (r.total_sply   ?? 0), 0);
      const growthPct = totalSPLY > 0
        ? parseFloat(((total - totalSPLY) / totalSPLY * 100).toFixed(2))
        : 0;

      return { ...def, total, totalSPLY, growthPct };
    });
  }, [rows]);
}