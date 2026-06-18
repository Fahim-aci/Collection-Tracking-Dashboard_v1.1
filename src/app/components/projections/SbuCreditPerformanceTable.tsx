import React, { useState, useMemo, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useCollectionSummary } from "../../../hooks/useCollectionSummary";
import { useDateFilter }        from "../../../context/DateFilterContext";
import { supabase }             from "../../../lib/supabaseClient";
import type { CollectionSummaryRow } from "../../../lib/database.types";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 60;

const CATEGORY_ORDER = [
  'Pharmaceuticals',
  'Agribusiness',
  'Consumer Brands',
  'CC&PH',
  'Logistics',
];

const PORTFOLIO_LABELS: Record<string, string> = {
  'Pharmaceuticals': 'Pharma',
  'Agribusiness':    'Agri',
  'Consumer Brands': 'CB',
  'CC&PH':           'CC&PH',
  'Logistics':       'ACI Logistics',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number) {
  if (v === 0) return "0.00";
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Achievement({ projected, actual }: { projected: number | null; actual: number }) {
  if (!projected || projected === 0) return <span className="text-[#D0D5DD]">—</span>;
  const pct = ((actual / projected) * 100);
  const pos = pct >= 0;
  return (
    <span className={`font-semibold text-[11px] ${pos ? "text-[#027A48]" : "text-[#B42318]"}`}>
      {pos ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

type ProjAgg = { credit: number; cash: number; total: number };

// ── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  page:       number;
  totalPages: number;
  onPage:     (p: number) => void;
}
function Pagination({ page, totalPages, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  const addPage = (p: number) => {
    if (pages[pages.length - 1] === p) return;
    pages.push(p);
  };
  const showGap = (a: number, b: number) => b - a > 1;

  addPage(0);
  if (showGap(0, page - 1)) pages.push("...");
  for (let p = Math.max(1, page - 1); p <= Math.min(totalPages - 2, page + 1); p++) addPage(p);
  if (showGap(page + 1, totalPages - 1)) pages.push("...");
  if (totalPages > 1) addPage(totalPages - 1);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-[#E4E7EC] shrink-0">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 0}
        className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-[#344054] border border-[#E4E7EC] rounded-lg disabled:opacity-40 hover:bg-[#F9FAFB] transition-colors"
      >
        <ChevronLeft className="size-[14px]" />
        Previous
      </button>
      <div className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`gap-${i}`} className="px-2 text-[12px] text-[#667085]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`h-[32px] min-w-[32px] px-1 text-[12px] font-medium rounded-lg transition-colors ${
                page === p
                  ? "bg-[#465FFF] text-white"
                  : "text-[#344054] hover:bg-[#F9FAFB] border border-[#E4E7EC]"
              }`}
            >
              {p + 1}
            </button>
          )
        )}
      </div>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages - 1}
        className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-[#344054] border border-[#E4E7EC] rounded-lg disabled:opacity-40 hover:bg-[#F9FAFB] transition-colors"
      >
        Next
        <ChevronRight className="size-[14px]" />
      </button>
    </div>
  );
}

// ── Column header group ───────────────────────────────────────────────────────

function GroupHeader({
  label, color, bg, borderColor,
}: { label: string; color: string; bg: string; borderColor: string }) {
  return (
    <th
      colSpan={3}
      className="text-center py-2 text-[10px] tracking-[0.25px] uppercase font-semibold border-r border-[#E4E7EC]"
      style={{ background: bg, color, borderBottom: `1px solid ${borderColor}` }}
    >
      {label}
    </th>
  );
}

// ── Category subtotal row ─────────────────────────────────────────────────────

interface CatTotals {
  credit: number; cash: number; total: number;
  proj_credit: number; proj_cash: number; proj_total: number;
}

function CategoryTotalRow({ label, ct }: { label: string; ct: CatTotals }) {
  const td  = "py-2 px-4 text-[12px] font-semibold text-[#344054] text-right bg-[#F9FAFB]";
  const ptd = "py-2 px-4 text-[12px] font-semibold text-[#475467] text-right bg-[#F9FAFB]";
  return (
    <tr className="border-t border-b-2 border-[#D1D5DB]" style={{ background: '#F9FAFB' }}>
      <td className="py-2 pl-3 pr-2 bg-[#F9FAFB]" />
      <td className="py-2 pl-3 pr-4 text-[12px] font-bold text-[#1D2939] border-r border-[#E4E7EC] bg-[#F9FAFB] uppercase tracking-wide">
        {label}
      </td>
      {/* Credit */}
      <td className={ptd}>{ct.proj_credit > 0 ? fmt(ct.proj_credit) : '—'}</td>
      <td className={td}>{fmt(ct.credit)}</td>
      <td className="py-2 px-4 text-right border-r border-[#E4E7EC] bg-[#F9FAFB]">
        <Achievement projected={ct.proj_credit || null} actual={ct.credit} />
      </td>
      {/* Cash */}
      <td className={ptd}>{ct.proj_cash > 0 ? fmt(ct.proj_cash) : '—'}</td>
      <td className={td}>{fmt(ct.cash)}</td>
      <td className="py-2 px-4 text-right border-r border-[#E4E7EC] bg-[#F9FAFB]">
        <Achievement projected={ct.proj_cash || null} actual={ct.cash} />
      </td>
      {/* Total */}
      <td className={ptd}>{ct.proj_total > 0 ? fmt(ct.proj_total) : '—'}</td>
      <td className={td}>{fmt(ct.total)}</td>
      <td className="py-2 px-4 text-right bg-[#F9FAFB]">
        <Achievement projected={ct.proj_total || null} actual={ct.total} />
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SbuCreditPerformanceTable() {
  const [search, setSearch] = useState("");
  const [page,   setPage]   = useState(0);

  const { dateRange } = useDateFilter();
  const { rows, loading, error } = useCollectionSummary(dateRange.dateFrom, dateRange.dateTo);

  // ── Projection totals per business (from business_projections) ────────────
  const [projMap, setProjMap] = useState<Map<string, ProjAgg>>(new Map());

  useEffect(() => {
    if (!dateRange.dateFrom || !dateRange.dateTo) return;
    let cancelled = false;
    supabase
      .from('business_projections')
      .select('business_id, credit_target, cash_target, total_target')
      .gte('projection_date', dateRange.dateFrom)
      .lte('projection_date', dateRange.dateTo)
      .then(({ data, error: err }) => {
        if (cancelled || err) return;
        const m = new Map<string, ProjAgg>();
        for (const r of data ?? []) {
          const e = m.get(r.business_id) ?? { credit: 0, cash: 0, total: 0 };
          m.set(r.business_id, {
            credit: e.credit + (r.credit_target ?? 0),
            cash:   e.cash   + (r.cash_target   ?? 0),
            total:  e.total  + (r.total_target  ?? 0),
          });
        }
        setProjMap(m);
      });
    return () => { cancelled = true; };
  }, [dateRange.dateFrom, dateRange.dateTo]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.business_name.toLowerCase().includes(q));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSearch = (v: string) => { setSearch(v); setPage(0); };
  const handlePage   = (p: number) => setPage(Math.max(0, Math.min(totalPages - 1, p)));

  // ── Group current page rows by category ───────────────────────────────────
  const grouped = useMemo(() => {
    const g: Record<string, CollectionSummaryRow[]> = {};
    for (const r of pageRows) {
      const cat = r.category ?? 'Other';
      if (!g[cat]) g[cat] = [];
      g[cat].push(r);
    }
    return g;
  }, [pageRows]);

  const orderedCats = useMemo(() => [
    ...CATEGORY_ORDER.filter(c => grouped[c]?.length),
    ...Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c) && grouped[c]?.length),
  ], [grouped]);

  // ── Per-category subtotals (full filtered set, not just page) ─────────────
  const catTotals = useMemo(() => {
    const result: Record<string, CatTotals> = {};
    for (const cat of orderedCats) {
      const catRows = filtered.filter(r => (r.category ?? 'Other') === cat);
      result[cat] = {
        credit:      catRows.reduce((s, r) => s + (r.credit_amount      ?? 0), 0),
        cash:        catRows.reduce((s, r) => s + (r.total_cash_amount  ?? 0), 0),
        total:       catRows.reduce((s, r) => s + (r.total_amount       ?? 0), 0),
        proj_credit: catRows.reduce((s, r) => s + (projMap.get(r.business_id)?.credit ?? 0), 0),
        proj_cash:   catRows.reduce((s, r) => s + (projMap.get(r.business_id)?.cash   ?? 0), 0),
        proj_total:  catRows.reduce((s, r) => s + (projMap.get(r.business_id)?.total  ?? 0), 0),
      };
    }
    return result;
  }, [filtered, orderedCats, projMap]);

  // ── Grand totals ──────────────────────────────────────────────────────────
  const grand = useMemo<CatTotals>(() => ({
    credit:      filtered.reduce((s, r) => s + (r.credit_amount      ?? 0), 0),
    cash:        filtered.reduce((s, r) => s + (r.total_cash_amount  ?? 0), 0),
    total:       filtered.reduce((s, r) => s + (r.total_amount       ?? 0), 0),
    proj_credit: filtered.reduce((s, r) => s + (projMap.get(r.business_id)?.credit ?? 0), 0),
    proj_cash:   filtered.reduce((s, r) => s + (projMap.get(r.business_id)?.cash   ?? 0), 0),
    proj_total:  filtered.reduce((s, r) => s + (projMap.get(r.business_id)?.total  ?? 0), 0),
  }), [filtered, projMap]);

  let slCounter = page * PAGE_SIZE;

  return (
    <div
      className="bg-white rounded-2xl border border-[#E4E7EC] w-full overflow-hidden flex flex-col"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* ── Card header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E7EC] shrink-0">
        <div>
          <h3 className="text-[15px] font-semibold text-[#101828]">Actual Performance</h3>
          <p className="text-[11px] text-[#667085] mt-0.5">Actual against projected performance across all SBUs</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-[14px] text-[#98A2B3]" />
          <input
            type="text"
            placeholder="Search business..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-[12px] border border-[#E4E7EC] rounded-[10px] w-[220px] text-[#344054] placeholder:text-[#98A2B3] outline-none focus:border-[#465FFF] transition-colors bg-white"
          />
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-5 mt-3 px-4 py-2 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] shrink-0">
          <span className="text-[12px] font-medium text-[#D92D20]">⚠ {error}</span>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="overflow-auto flex-1">
        <table className="w-full min-w-[900px] border-collapse">
          <thead className="sticky top-0 z-30">
            {/* Row 1 — group headers */}
            <tr className="bg-[#F9FAFB] border-b border-[#E4E7EC]">
              <th colSpan={2} className="border-r border-[#E4E7EC] py-[7px]" style={{ minWidth: 230 }} />
              <GroupHeader label="Credit Performance" color="#6941C6" bg="#F4F0FF" borderColor="#E4E7EC" />
              <GroupHeader label="Cash Performance"   color="#026AA2" bg="#F0F9FF" borderColor="#E4E7EC" />
              <th
                colSpan={3}
                className="text-center py-2 text-[10px] tracking-[0.25px] uppercase font-semibold"
                style={{ background: "#F0FDF4", color: "#027A48", borderBottom: "1px solid #E4E7EC" }}
              >
                Total Performance
              </th>
            </tr>
            {/* Row 2 — sub-column labels */}
            <tr className="bg-[#F9FAFB] border-b border-[#E4E7EC]">
              <th className="py-2.5 pl-3 pr-2 text-[10px] font-semibold text-[#667085] uppercase tracking-[0.25px] text-right w-[40px]">#</th>
              <th className="py-2.5 pl-3 pr-4 text-[10px] font-semibold text-[#667085] uppercase tracking-[0.25px] text-left border-r border-[#E4E7EC]" style={{ minWidth: 190 }}>Business</th>
              {/* Credit */}
              <th className="py-2.5 px-4 text-[10px] font-semibold text-[#667085] uppercase tracking-[0.25px] text-right whitespace-nowrap border-r border-[#E4E7EC]">Projected</th>
              <th className="py-2.5 px-4 text-[10px] font-semibold text-[#667085] uppercase tracking-[0.25px] text-right whitespace-nowrap border-r border-[#E4E7EC]">Actual</th>
              <th className="py-2.5 px-4 text-[10px] font-semibold text-[#667085] uppercase tracking-[0.25px] text-right whitespace-nowrap border-r border-[#E4E7EC]">Achievement</th>
              {/* Cash */}
              <th className="py-2.5 px-4 text-[10px] font-semibold text-[#667085] uppercase tracking-[0.25px] text-right whitespace-nowrap border-r border-[#E4E7EC]">Projected</th>
              <th className="py-2.5 px-4 text-[10px] font-semibold text-[#667085] uppercase tracking-[0.25px] text-right whitespace-nowrap border-r border-[#E4E7EC]">Actual</th>
              <th className="py-2.5 px-4 text-[10px] font-semibold text-[#667085] uppercase tracking-[0.25px] text-right whitespace-nowrap border-r border-[#E4E7EC]">Achievement</th>
              {/* Total */}
              <th className="py-2.5 px-4 text-[10px] font-semibold text-[#667085] uppercase tracking-[0.25px] text-right whitespace-nowrap border-r border-[#E4E7EC]">Projected</th>
              <th className="py-2.5 px-4 text-[10px] font-semibold text-[#667085] uppercase tracking-[0.25px] text-right whitespace-nowrap border-r border-[#E4E7EC]">Actual</th>
              <th className="py-2.5 px-4 text-[10px] font-semibold text-[#667085] uppercase tracking-[0.25px] text-right whitespace-nowrap border-r border-[#E4E7EC]">Achievement</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F2F4F7] animate-pulse">
                  <td className="py-2 px-3 text-right"><div className="h-3 w-4 bg-[#E4E7EC] rounded ml-auto" /></td>
                  <td className="py-2 pl-3 pr-4 border-r border-[#E4E7EC]"><div className="h-3 w-36 bg-[#E4E7EC] rounded" /></td>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="py-2 px-4 text-right"><div className="h-3 w-14 bg-[#E4E7EC] rounded ml-auto" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-16 text-center text-[13px] text-[#98A2B3]">
                  {search ? "No businesses match your search." : "No data for this period."}
                </td>
              </tr>
            ) : (
              <>
                {orderedCats.map(cat => {
                  const catRows = grouped[cat] ?? [];
                  const label   = PORTFOLIO_LABELS[cat] ?? `${cat} Portfolio`;
                  const ct      = catTotals[cat];

                  return (
                    <React.Fragment key={cat}>
                      {catRows.map((row, idx) => {
                        slCounter++;
                        const isAlt    = idx % 2 === 1;
                        const creditAct = row.credit_amount      ?? 0;
                        const cashAct   = row.total_cash_amount  ?? 0;
                        const totalAct  = row.total_amount       ?? 0;
                        const proj      = projMap.get(row.business_id);
                        const creditProj = proj?.credit || null;
                        const cashProj   = proj?.cash   || null;
                        const totalProj  = proj?.total  || null;

                        return (
                          <tr
                            key={row.business_id}
                            className={`border-b border-[#F2F4F7] hover:bg-[#F9FAFB] transition-colors ${
                              isAlt ? "bg-[rgba(254,243,242,0.4)]" : "bg-white"
                            }`}
                          >
                            <td className="py-2 pl-3 pr-2 text-[12px] text-[#98A2B3] text-right w-[40px]">{slCounter}</td>
                            <td className="py-2 pl-3 pr-4 text-[12px] font-medium text-[#344054] border-r border-[#E4E7EC] max-w-[190px] truncate">
                              {row.business_name}
                            </td>
                            {/* Credit */}
                            <td className="py-2 px-4 text-[12px] text-[#475467] text-right">{creditProj ? fmt(creditProj) : '—'}</td>
                            <td className="py-2 px-4 text-[12px] text-[#475467] text-right">{fmt(creditAct)}</td>
                            <td className="py-2 px-4 text-right border-r border-[#E4E7EC]">
                              <Achievement projected={creditProj} actual={creditAct} />
                            </td>
                            {/* Cash */}
                            <td className="py-2 px-4 text-[12px] text-[#475467] text-right">{cashProj ? fmt(cashProj) : '—'}</td>
                            <td className="py-2 px-4 text-[12px] text-[#475467] text-right">{fmt(cashAct)}</td>
                            <td className="py-2 px-4 text-right border-r border-[#E4E7EC]">
                              <Achievement projected={cashProj} actual={cashAct} />
                            </td>
                            {/* Total */}
                            <td className="py-2 px-4 text-[12px] text-[#475467] text-right">{totalProj ? fmt(totalProj) : '—'}</td>
                            <td className="py-2 px-4 text-[12px] text-[#475467] text-right">{fmt(totalAct)}</td>
                            <td className="py-2 px-4 text-right">
                              <Achievement projected={totalProj} actual={totalAct} />
                            </td>
                          </tr>
                        );
                      })}

                      {/* ── Category (Portfolio) subtotal row ─────────────── */}
                      {ct && <CategoryTotalRow label={label} ct={ct} />}
                    </React.Fragment>
                  );
                })}

                {/* ── ACI Group grand total ─────────────────────────────── */}
                <tr className="border-t-2 border-[#344054]" style={{ background: '#F0F9FF' }}>
                  <td className="py-3 pl-3 pr-2 bg-[#F0F9FF]" />
                  <td className="py-3 pl-3 pr-4 text-[13px] font-bold text-[#1D2939] border-r border-[#E4E7EC] bg-[#F0F9FF] uppercase tracking-wide">
                    ACI Group
                  </td>
                  {/* Credit */}
                  <td className="py-3 px-4 text-[13px] font-bold text-[#475467] text-right bg-[#F0F9FF]">{grand.proj_credit > 0 ? fmt(grand.proj_credit) : '—'}</td>
                  <td className="py-3 px-4 text-[13px] font-bold text-[#344054] text-right bg-[#F0F9FF]">{fmt(grand.credit)}</td>
                  <td className="py-3 px-4 text-right border-r border-[#E4E7EC] bg-[#F0F9FF]">
                    <Achievement projected={grand.proj_credit || null} actual={grand.credit} />
                  </td>
                  {/* Cash */}
                  <td className="py-3 px-4 text-[13px] font-bold text-[#475467] text-right bg-[#F0F9FF]">{grand.proj_cash > 0 ? fmt(grand.proj_cash) : '—'}</td>
                  <td className="py-3 px-4 text-[13px] font-bold text-[#344054] text-right bg-[#F0F9FF]">{fmt(grand.cash)}</td>
                  <td className="py-3 px-4 text-right border-r border-[#E4E7EC] bg-[#F0F9FF]">
                    <Achievement projected={grand.proj_cash || null} actual={grand.cash} />
                  </td>
                  {/* Total */}
                  <td className="py-3 px-4 text-[13px] font-bold text-[#475467] text-right bg-[#F0F9FF]">{grand.proj_total > 0 ? fmt(grand.proj_total) : '—'}</td>
                  <td className="py-3 px-4 text-[13px] font-bold text-[#344054] text-right bg-[#F0F9FF]">{fmt(grand.total)}</td>
                  <td className="py-3 px-4 text-right bg-[#F0F9FF]">
                    <Achievement projected={grand.proj_total || null} actual={grand.total} />
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────────── */}
      {!loading && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPage={handlePage}
        />
      )}
    </div>
  );
}
