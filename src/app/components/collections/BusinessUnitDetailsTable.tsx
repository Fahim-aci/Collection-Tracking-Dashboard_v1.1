import React, { useState, useMemo }      from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useDateFilter }               from "../../../context/DateFilterContext";
import { useBusinessUnitDetails }      from "../../../hooks/useBusinessUnitDetails";
import type { BusinessUnitDetailRow }  from "../../../hooks/useBusinessUnitDetails";

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

// ── Number formatter ──────────────────────────────────────────────────────────

function fmtNum(v: number | null | undefined): string {
  if (v == null || v === 0) return "—";
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ratio(curr: number, prev: number): number | null {
  if (!prev) return null;
  return curr / prev;
}

// ── Growth ratio cell ─────────────────────────────────────────────────────────

function GrowthCell({ ratio }: { ratio: number | null }) {
  if (ratio === null) {
    return <span className="text-[#9CA3AF] text-[11px]">—</span>;
  }
  const isGood = ratio >= 1;
  return (
    <span
      className="text-[11px] font-semibold"
      style={{ color: isGood ? "#15803D" : "#991B1B" }}
    >
      {ratio.toFixed(2)}
    </span>
  );
}

// ── Group header (row 1) ──────────────────────────────────────────────────────

interface GroupThProps {
  label:      string;
  colSpan:    number;
  color:      string;
  bg:         string;
  border?:    boolean;
  textWhite?: boolean;
}
function GroupTh({ label, colSpan, color, bg, border = true, textWhite }: GroupThProps) {
  return (
    <th
      colSpan={colSpan}
      className={`text-center py-2 text-[10px] tracking-[0.25px] uppercase font-semibold ${
        border ? "border-r border-[#E4E7EC]" : ""
      }`}
      style={{ background: bg, color: textWhite ? "#fff" : color, borderBottom: "1px solid #E4E7EC" }}
    >
      {label}
    </th>
  );
}

// ── Sub-column header (row 2) ─────────────────────────────────────────────────

interface SubThProps {
  label:   string;
  border?: boolean;
}
function SubTh({ label, border = true }: SubThProps) {
  return (
    <th
      className={`py-2.5 px-4 text-[10px] font-semibold text-[#667085] uppercase tracking-[0.25px] text-center whitespace-nowrap bg-[#F9FAFB] ${
        border ? "border-r border-[#E4E7EC]" : ""
      }`}
    >
      {label}
    </th>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  page:       number;
  totalPages: number;
  total:      number;
  onPage:     (p: number) => void;
}
function Pagination({ page, totalPages, total, onPage }: PaginationProps) {
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

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[#F2F4F7] animate-pulse">
      <td className="py-2 px-3"><div className="h-3 w-4 bg-[#E4E7EC] rounded mx-auto" /></td>
      <td className="py-2 px-3 border-r border-[#E4E7EC]"><div className="h-3 w-32 bg-[#E4E7EC] rounded" /></td>
      {Array.from({ length: 15 }).map((_, i) => (
        <td key={i} className="py-2 px-2 text-center">
          <div className="h-3 w-10 bg-[#E4E7EC] rounded mx-auto" />
        </td>
      ))}
    </tr>
  );
}

// ── Category subtotal row ─────────────────────────────────────────────────────

interface CategoryTotals {
  cur_credit: number; cur_cash: number; cur_total: number;
  splm_credit: number; splm_cash: number; splm_total: number;
  sply_credit: number; sply_cash: number; sply_total: number;
}

function CategoryTotalRow({ label, ct }: { label: string; ct: CategoryTotals }) {
  const growthSplmCredit = ratio(ct.cur_credit, ct.splm_credit);
  const growthSplmCash   = ratio(ct.cur_cash,   ct.splm_cash);
  const growthSplmTotal  = ratio(ct.cur_total,  ct.splm_total);
  const growthSplyCredit = ratio(ct.cur_credit, ct.sply_credit);
  const growthSplyCash   = ratio(ct.cur_cash,   ct.sply_cash);
  const growthSplyTotal  = ratio(ct.cur_total,  ct.sply_total);

  const td = "py-2 px-4 text-[12px] font-semibold text-[#344054] text-center bg-[#F9FAFB]";

  return (
    <tr className="border-t border-b-2 border-[#D1D5DB]" style={{ background: '#F9FAFB' }}>
      <td className="py-2 pl-3 pr-2 bg-[#F9FAFB]" />
      <td className="py-2 pl-3 pr-4 text-[12px] font-bold text-[#1D2939] border-r border-[#E4E7EC] bg-[#F9FAFB] uppercase tracking-wide">
        {label}
      </td>
      <td className={td}>{fmtNum(ct.cur_credit)}</td>
      <td className={td}>{fmtNum(ct.cur_cash)}</td>
      <td className={td}>{fmtNum(ct.cur_total)}</td>
      <td className={td}>{fmtNum(ct.splm_credit)}</td>
      <td className={td}>{fmtNum(ct.splm_cash)}</td>
      <td className={td}>{fmtNum(ct.splm_total)}</td>
      <td className={td}>{fmtNum(ct.sply_credit)}</td>
      <td className={td}>{fmtNum(ct.sply_cash)}</td>
      <td className={td}>{fmtNum(ct.sply_total)}</td>
      <td className="py-2 px-4 text-center bg-[#F9FAFB]"><GrowthCell ratio={growthSplmCredit} /></td>
      <td className="py-2 px-4 text-center bg-[#F9FAFB]"><GrowthCell ratio={growthSplmCash}   /></td>
      <td className="py-2 px-4 text-center bg-[#F9FAFB]"><GrowthCell ratio={growthSplmTotal}  /></td>
      <td className="py-2 px-4 text-center bg-[#F9FAFB]"><GrowthCell ratio={growthSplyCredit} /></td>
      <td className="py-2 px-4 text-center bg-[#F9FAFB]"><GrowthCell ratio={growthSplyCash}   /></td>
      <td className="py-2 px-4 text-center bg-[#F9FAFB]"><GrowthCell ratio={growthSplyTotal}  /></td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BusinessUnitDetailsTable() {
  const [search, setSearch] = useState("");
  const [page,   setPage]   = useState(0);

  const { dateRange } = useDateFilter();
  const { rows, loading, error } = useBusinessUnitDetails(dateRange);

  // Search filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r: BusinessUnitDetailRow) =>
      r.business_name.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSearch = (v: string) => { setSearch(v); setPage(0); };
  const handlePage   = (p: number) => setPage(Math.max(0, Math.min(totalPages - 1, p)));

  // ── Group current page rows by category ───────────────────────────────────
  const grouped = useMemo(() => {
    const g: Record<string, BusinessUnitDetailRow[]> = {};
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

  // ── Per-category subtotals (from full filtered set, not just page) ────────
  const catTotals = useMemo(() => {
    const result: Record<string, CategoryTotals> = {};
    for (const cat of orderedCats) {
      // Use all filtered rows for the category, not just the current page
      const catRows = filtered.filter(r => (r.category ?? 'Other') === cat);
      result[cat] = {
        cur_credit:  catRows.reduce((s, r) => s + (r.credit_amount      ?? 0), 0),
        cur_cash:    catRows.reduce((s, r) => s + (r.total_cash_amount  ?? 0), 0),
        cur_total:   catRows.reduce((s, r) => s + (r.total_amount       ?? 0), 0),
        splm_credit: catRows.reduce((s, r) => s + (r.splm_credit        ?? 0), 0),
        splm_cash:   catRows.reduce((s, r) => s + (r.splm_cash          ?? 0), 0),
        splm_total:  catRows.reduce((s, r) => s + (r.splm_total         ?? 0), 0),
        sply_credit: catRows.reduce((s, r) => s + (r.credit_sply        ?? 0), 0),
        sply_cash:   catRows.reduce((s, r) => s + (r.total_cash_sply    ?? 0), 0),
        sply_total:  catRows.reduce((s, r) => s + (r.total_sply         ?? 0), 0),
      };
    }
    return result;
  }, [filtered, orderedCats]);

  // ── Grand totals (full filtered set) ─────────────────────────────────────
  const grand = useMemo<CategoryTotals>(() => ({
    cur_credit:  filtered.reduce((s, r) => s + (r.credit_amount      ?? 0), 0),
    cur_cash:    filtered.reduce((s, r) => s + (r.total_cash_amount  ?? 0), 0),
    cur_total:   filtered.reduce((s, r) => s + (r.total_amount       ?? 0), 0),
    splm_credit: filtered.reduce((s, r) => s + (r.splm_credit        ?? 0), 0),
    splm_cash:   filtered.reduce((s, r) => s + (r.splm_cash          ?? 0), 0),
    splm_total:  filtered.reduce((s, r) => s + (r.splm_total         ?? 0), 0),
    sply_credit: filtered.reduce((s, r) => s + (r.credit_sply        ?? 0), 0),
    sply_cash:   filtered.reduce((s, r) => s + (r.total_cash_sply    ?? 0), 0),
    sply_total:  filtered.reduce((s, r) => s + (r.total_sply         ?? 0), 0),
  }), [filtered]);

  const grandGrowthSplmCredit = ratio(grand.cur_credit, grand.splm_credit);
  const grandGrowthSplmCash   = ratio(grand.cur_cash,   grand.splm_cash);
  const grandGrowthSplmTotal  = ratio(grand.cur_total,  grand.splm_total);
  const grandGrowthSplyCredit = ratio(grand.cur_credit, grand.sply_credit);
  const grandGrowthSplyCash   = ratio(grand.cur_cash,   grand.sply_cash);
  const grandGrowthSplyTotal  = ratio(grand.cur_total,  grand.sply_total);

  // Running SL counter across all category groups
  let slCounter = page * PAGE_SIZE;

  return (
    <div
      className="bg-white rounded-2xl border border-[#E4E7EC] w-full overflow-hidden flex flex-col"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* ── Card header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E7EC] shrink-0">
        <div>
          <h3 className="text-[15px] font-semibold text-[#101828]">Collection Performance</h3>
          <p className="text-[11px] text-[#667085] mt-0.5">Business unit wise overall performance across all SBUs</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-[16px] text-[#667085]" />
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
        <div className="mx-6 mt-3 px-4 py-2 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] shrink-0">
          <span className="text-[12px] font-medium text-[#D92D20]">⚠ {error}</span>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="overflow-auto flex-1">
        <table className="w-full min-w-[1130px]">
          <thead className="sticky top-0 z-40">
            {/* ── Row 1: Group headers ──────────────────────────────────────── */}
            <tr className="bg-[#F9FAFB] border-b border-[#E4E7EC]">
              <th
                rowSpan={2}
                className="border-r border-[#E4E7EC] text-[10px] font-semibold text-[#667085] uppercase tracking-[0.25px] text-right px-3 bg-[#F9FAFB]"
                style={{ minWidth: 48 }}
              >
                #
              </th>
              <th
                rowSpan={2}
                className="border-r border-[#E4E7EC] text-[10px] font-semibold text-[#667085] uppercase tracking-[0.25px] text-left pl-3 pr-4 bg-[#F9FAFB]"
                style={{ minWidth: 180 }}
              >
                Business
              </th>
              <GroupTh label="Current Place"  colSpan={3} color="#6941C6" bg="#F4F0FF" />
              <GroupTh label="SPLM"           colSpan={3} color="#026AA2" bg="#F0F9FF" />
              <GroupTh label="SPLY"           colSpan={3} color="#026AA2" bg="#F0F9FF" />
              <GroupTh label="Growth vs SPLM" colSpan={3} color="#027A48" bg="#F0FDF4" />
              <GroupTh label="Growth vs SPLY" colSpan={3} color="#027A48" bg="#F0FDF4" border={false} />
            </tr>

            {/* ── Row 2: Sub-column labels ──────────────────────────────────── */}
            <tr className="bg-[#F9FAFB] border-b border-[#E4E7EC]">
              <SubTh label="Credit" /><SubTh label="Cash" /><SubTh label="Total" />
              <SubTh label="Credit" /><SubTh label="Cash" /><SubTh label="Total" />
              <SubTh label="Credit" /><SubTh label="Cash" /><SubTh label="Total" />
              <SubTh label="Credit" /><SubTh label="Cash" /><SubTh label="Total" />
              <SubTh label="Credit" /><SubTh label="Cash" /><SubTh label="Total" border={false} />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonRow key={i} />)
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={17} className="py-16 text-center text-[13px] text-[#98A2B3]">
                  {search ? "No businesses match your search." : "No data for this period."}
                </td>
              </tr>
            ) : (
              <>
                {orderedCats.map(cat => {
                  const catRows = grouped[cat] ?? [];
                  const label   = PORTFOLIO_LABELS[cat] ?? `${cat}`;
                  const ct      = catTotals[cat];

                  return (
                    <React.Fragment key={cat}>
                      {catRows.map((row: BusinessUnitDetailRow, idx: number) => {
                        slCounter++;
                        const isAlt = idx % 2 === 1;
                        return (
                          <tr
                            key={row.business_id}
                            className={`border-b border-[#F2F4F7] hover:bg-[#F9FAFB] transition-colors ${
                              isAlt ? "bg-[rgba(254,243,242,0.4)]" : "bg-white"
                            }`}
                          >
                            <td className="py-2 pl-3 pr-2 text-[12px] text-[#98A2B3] text-right w-[48px]">
                              {slCounter}
                            </td>
                            <td className="py-2 pr-4 text-[12px] font-medium text-[#344054] border-r border-[#E4E7EC] max-w-[180px] truncate">
                              {row.business_name}
                            </td>
                            <td className="py-2 px-4 text-[12px] text-[#475467] text-center">{fmtNum(row.credit_amount)}</td>
                            <td className="py-2 px-4 text-[12px] text-[#475467] text-center">{fmtNum(row.total_cash_amount)}</td>
                            <td className="py-2 px-4 text-[12px] text-[#475467] text-center">{fmtNum(row.total_amount)}</td>
                            <td className="py-2 px-4 text-[12px] text-[#475467] text-center">{fmtNum(row.splm_credit)}</td>
                            <td className="py-2 px-4 text-[12px] text-[#475467] text-center">{fmtNum(row.splm_cash)}</td>
                            <td className="py-2 px-4 text-[12px] text-[#475467] text-center">{fmtNum(row.splm_total)}</td>
                            <td className="py-2 px-4 text-[12px] text-[#475467] text-center">{fmtNum(row.credit_sply)}</td>
                            <td className="py-2 px-4 text-[12px] text-[#475467] text-center">{fmtNum(row.total_cash_sply)}</td>
                            <td className="py-2 px-4 text-[12px] text-[#475467] text-center">{fmtNum(row.total_sply)}</td>
                            <td className="py-2 px-4 text-center"><GrowthCell ratio={row.growth_splm_credit} /></td>
                            <td className="py-2 px-4 text-center"><GrowthCell ratio={row.growth_splm_cash}   /></td>
                            <td className="py-2 px-4 text-center"><GrowthCell ratio={row.growth_splm_total}  /></td>
                            <td className="py-2 px-4 text-center"><GrowthCell ratio={row.growth_sply_credit} /></td>
                            <td className="py-2 px-4 text-center"><GrowthCell ratio={row.growth_sply_cash}   /></td>
                            <td className="py-2 px-4 text-center"><GrowthCell ratio={row.growth_sply_total}  /></td>
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
                  <td className="py-2 pl-3 pr-2 bg-[#F0F9FF]" />
                  <td className="py-2 pl-3 pr-4 text-[13px] font-bold text-[#1D2939] border-r border-[#E4E7EC] bg-[#F0F9FF] uppercase tracking-wide">
                    ACI Group
                  </td>
                  <td className="py-2 px-4 text-[13px] font-bold text-[#344054] text-center bg-[#F0F9FF]">{fmtNum(grand.cur_credit)}</td>
                  <td className="py-2 px-4 text-[13px] font-bold text-[#344054] text-center bg-[#F0F9FF]">{fmtNum(grand.cur_cash)}</td>
                  <td className="py-2 px-4 text-[13px] font-bold text-[#344054] text-center bg-[#F0F9FF]">{fmtNum(grand.cur_total)}</td>
                  <td className="py-2 px-4 text-[13px] font-bold text-[#344054] text-center bg-[#F0F9FF]">{fmtNum(grand.splm_credit)}</td>
                  <td className="py-2 px-4 text-[13px] font-bold text-[#344054] text-center bg-[#F0F9FF]">{fmtNum(grand.splm_cash)}</td>
                  <td className="py-2 px-4 text-[13px] font-bold text-[#344054] text-center bg-[#F0F9FF]">{fmtNum(grand.splm_total)}</td>
                  <td className="py-2 px-4 text-[13px] font-bold text-[#344054] text-center bg-[#F0F9FF]">{fmtNum(grand.sply_credit)}</td>
                  <td className="py-2 px-4 text-[13px] font-bold text-[#344054] text-center bg-[#F0F9FF]">{fmtNum(grand.sply_cash)}</td>
                  <td className="py-2 px-4 text-[13px] font-bold text-[#344054] text-center bg-[#F0F9FF]">{fmtNum(grand.sply_total)}</td>
                  <td className="py-2 px-4 text-center bg-[#F0F9FF]"><GrowthCell ratio={grandGrowthSplmCredit} /></td>
                  <td className="py-2 px-4 text-center bg-[#F0F9FF]"><GrowthCell ratio={grandGrowthSplmCash}   /></td>
                  <td className="py-2 px-4 text-center bg-[#F0F9FF]"><GrowthCell ratio={grandGrowthSplmTotal}  /></td>
                  <td className="py-2 px-4 text-center bg-[#F0F9FF]"><GrowthCell ratio={grandGrowthSplyCredit} /></td>
                  <td className="py-2 px-4 text-center bg-[#F0F9FF]"><GrowthCell ratio={grandGrowthSplyCash}   /></td>
                  <td className="py-2 px-4 text-center bg-[#F0F9FF]"><GrowthCell ratio={grandGrowthSplyTotal}  /></td>
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
          total={filtered.length}
          onPage={handlePage}
        />
      )}
    </div>
  );
}
