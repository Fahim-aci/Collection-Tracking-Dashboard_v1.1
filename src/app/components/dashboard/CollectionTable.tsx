import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useDateFilter }          from "../../../context/DateFilterContext";
import { useBusinessUnitDetails } from "../../../hooks/useBusinessUnitDetails";
import type { BusinessUnitDetailRow } from "../../../hooks/useBusinessUnitDetails";

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtNum(v: number | null | undefined): string {
  if (v == null || v === 0) return "—";
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function GrowthCell({ ratio }: { ratio: number | null }) {
  if (ratio === null) return <span className="text-[#D0D5DD]">—</span>;
  const isGood = ratio >= 1;
  return (
    <span className="font-semibold" style={{ color: isGood ? "#15803D" : "#991B1B" }}>
      {ratio.toFixed(2)}
    </span>
  );
}

// ── Sort types ────────────────────────────────────────────────────────────────

type SortKey = "business_name" | "total_amount" | "splm_total" | "total_sply" | "growth_splm_total" | "growth_sply_total";
type SortDir = "asc" | "desc";

// ── Sub-components ────────────────────────────────────────────────────────────

interface SortIconProps { col: SortKey; sortKey: SortKey; sortDir: SortDir; }
function SortIcon({ col, sortKey, sortDir }: SortIconProps) {
  if (sortKey !== col) return <ChevronDown className="size-[12px] text-[#D0D5DD]" />;
  return sortDir === "asc"
    ? <ChevronUp   className="size-[12px] text-[#465FFF]" />
    : <ChevronDown className="size-[12px] text-[#465FFF]" />;
}

interface ThProps {
  label: string; col: SortKey; right?: boolean;
  sortKey: SortKey; sortDir: SortDir;
  onSort: (col: SortKey) => void;
}
function Th({ label, col, right, sortKey, sortDir, onSort }: ThProps) {
  return (
    <th
      className={`py-3 px-4 text-[12px] font-semibold text-[#667085] cursor-pointer select-none hover:text-[#344054] transition-colors whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}
      onClick={() => onSort(col)}
    >
      <div className={`flex items-center gap-1 ${right ? 'justify-end' : ''}`}>
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </div>
    </th>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CollectionTable() {
  const [sortKey, setSortKey] = useState<SortKey>("total_amount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page,    setPage]    = useState(0);
  const PAGE_SIZE = 8;

  const { dateRange }                    = useDateFilter();
  const { rows, loading, error }         = useBusinessUnitDetails(dateRange);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
    setPage(0);
  };

  const sorted = [...rows].sort((a: BusinessUnitDetailRow, b: BusinessUnitDetailRow) => {
    if (sortKey === "business_name") {
      return sortDir === "asc"
        ? a.business_name.localeCompare(b.business_name)
        : b.business_name.localeCompare(a.business_name);
    }
    const av = (a[sortKey] ?? 0) as number;
    const bv = (b[sortKey] ?? 0) as number;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE) || 1;
  const pageRows   = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div
      className="bg-white rounded-2xl border border-[#E4E7EC] w-full overflow-hidden"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E4E7EC]">
        <h3 className="text-[17px] font-semibold text-[#1D2939]">Collection Summary</h3>
        <p className="text-[12px] text-[#667085] mt-0.5">All business units — Figures in Million Taka</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-3 px-4 py-2.5 rounded-lg bg-[#FEF3F2] border border-[#FECDCA]">
          <span className="text-[12px] font-medium text-[#D92D20]">⚠ {error}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-[#F9FAFB] border-b border-[#E4E7EC]">
            <tr>
              <Th label="SBU"         col="business_name"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <Th label="Actual"      col="total_amount"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
              <Th label="SPLM"        col="splm_total"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
              <Th label="SPLY"        col="total_sply"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
              <Th label="SPLM Growth" col="growth_splm_total" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
              <Th label="SPLY Growth" col="growth_sply_total" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F4F7]">
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3 px-4"><div className="h-4 w-36 bg-[#E4E7EC] rounded" /></td>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="py-3 px-4 text-right"><div className="h-4 w-20 bg-[#E4E7EC] rounded ml-auto" /></td>
                  ))}
                </tr>
              ))
            ) : (
              pageRows.map(row => (
                <tr key={row.business_id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="py-3 px-4 text-[13px] text-[#344054] font-medium truncate max-w-[200px]">
                    {row.business_name}
                  </td>
                  <td className="py-3 px-4 text-[13px] font-semibold text-[#1D2939] text-right">
                    {fmtNum(row.total_amount)}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#667085] text-right">
                    {fmtNum(row.splm_total)}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#667085] text-right">
                    {fmtNum(row.total_sply)}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-right">
                    <GrowthCell ratio={row.growth_splm_total} />
                  </td>
                  <td className="py-3 px-4 text-[13px] text-right">
                    <GrowthCell ratio={row.growth_sply_total} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-[#E4E7EC]">
        <span className="text-[12px] text-[#667085]">
          {loading
            ? "Loading…"
            : `Showing ${sorted.length === 0 ? 0 : page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, sorted.length)} of ${sorted.length} SBUs`
          }
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="h-[28px] px-3 text-[12px] font-medium text-[#344054] border border-[#E4E7EC] rounded-lg disabled:opacity-40 hover:bg-[#F9FAFB] transition-colors"
          >
            Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-[28px] w-[28px] text-[12px] font-medium rounded-lg transition-colors ${
                page === i
                  ? 'bg-[#465FFF] text-white'
                  : 'text-[#344054] hover:bg-[#F9FAFB] border border-[#E4E7EC]'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1 || loading}
            className="h-[28px] px-3 text-[12px] font-medium text-[#344054] border border-[#E4E7EC] rounded-lg disabled:opacity-40 hover:bg-[#F9FAFB] transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
