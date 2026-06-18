import { useState, useMemo, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown } from "lucide-react";
import { useDateFilter }         from "../../../context/DateFilterContext";
import { useMonthlyTrend }      from "../../../hooks/useMonthlyTrend";
import { useCollectionSummary } from "../../../hooks/useCollectionSummary";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCr(v: number) {
  return `${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Mn`;
}

function formatChartVal(v: number) {
  return `${v.toLocaleString()} Cr.`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E4E7EC] rounded-xl shadow-lg p-3 text-[12px]" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <p className="font-semibold text-[#344054] mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatChartVal(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PerformanceStats() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [showDropdown,     setShowDropdown]     = useState(false);

  const { dateRange, fiscalYear } = useDateFilter();

  // Monthly trend — all SBUs, full fiscal year (no per-category RPC available)
  const { data: trendData, loading: trendLoading, error: trendError } =
    useMonthlyTrend(fiscalYear);

  // Per-SBU totals scoped to the active date range
  const { rows, loading: summaryLoading } = useCollectionSummary(
    dateRange.dateFrom,
    dateRange.dateTo,
  );

  // Derive unique categories from live rows
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(rows.map(r => r.category).filter((c): c is string => Boolean(c)))
    ).sort();
    return ["All", ...cats];
  }, [rows]);

  // If selected category is no longer in the data, reset
  useEffect(() => {
    if (selectedCategory !== "All" && !categories.includes(selectedCategory)) {
      setSelectedCategory("All");
    }
  }, [categories, selectedCategory]);

  // Filter rows by selected category
  const filteredRows = useMemo(
    () =>
      selectedCategory === "All"
        ? rows
        : rows.filter(r => r.category === selectedCategory),
    [rows, selectedCategory],
  );

  // Stat badges computed from date-range + category filtered rows
  const periodTotal = filteredRows.reduce((s, r) => s + (r.total_amount ?? 0), 0);
  const splyTotal   = filteredRows.reduce((s, r) => s + (r.total_sply   ?? 0), 0);
  const growthPct   = splyTotal > 0 ? ((periodTotal - splyTotal) / splyTotal) * 100 : 0;

  // Dedupe trend data by month label — duplicate x-axis categories cause
  // Recharts to emit duplicate React keys inside its <Surface> SVG.
  const chartData = useMemo(() => {
    const seen = new Map<string, { month: string; current: number; sply: number }>();
    for (const p of trendData) {
      const existing = seen.get(p.month);
      if (existing) {
        existing.current += p.current;
        existing.sply    += p.sply;
      } else {
        seen.set(p.month, { ...p });
      }
    }
    return Array.from(seen.values());
  }, [trendData]);

  // Chart loading is independent of summary loading so a slow/failing
  // get_collection_summary RPC never blocks the trend chart from rendering.
  const statsLoading = summaryLoading;

  return (
    <div
      className="bg-white rounded-2xl border border-[#E4E7EC] w-full"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#E4E7EC]">
        <div>
          <h3 className="text-[17px] font-semibold text-[#1D2939]">Performance Statistics</h3>
          <p className="text-[13px] text-[#667085] mt-0.5">
            {selectedCategory === "All" ? "All SBUs" : selectedCategory} : {dateRange.dateFrom ?? "—"} To {dateRange.dateTo ?? "—"}
          </p>
        </div>

        {/* Category dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(v => !v)}
            className="flex items-center gap-2 h-[38px] px-4 border border-[#D0D5DD] rounded-lg text-[13px] text-[#1D2939] bg-white hover:bg-[#F9FAFB] transition-colors shadow-sm"
          >
            {selectedCategory}
            <ChevronDown className="size-[14px] text-[#667085]" />
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-[200px] bg-white border border-[#E4E7EC] rounded-xl shadow-lg z-20 py-1 max-h-[280px] overflow-y-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setShowDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-[13px] hover:bg-[#F9FAFB] transition-colors ${cat === selectedCategory ? "text-[#465FFF] font-medium" : "text-[#344054]"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats row — driven by filtered rows (date range + category) */}
      <div className="flex items-center gap-6 px-6 pb-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-[18px] font-bold text-[#1D2939] leading-7">
              {statsLoading ? "—" : formatCr(periodTotal)}
            </span>
            <span className="text-[11px] font-semibold text-[#667085]">Period Total</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-[18px] font-bold text-[#1D2939] leading-7">
              {statsLoading ? "—" : formatCr(splyTotal)}
            </span>
            <span className="text-[11px] font-semibold text-[#667085]">SPLY</span>
          </div>
          {!statsLoading && (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${growthPct >= 0 ? "bg-[#ECFDF3] text-[#039855]" : "bg-[#FEF3F2] text-[#D92D20]"}`}>
              {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Error banners */}
      {trendError && (
        <div className="mx-6 mb-3 px-4 py-2 rounded-lg bg-[#FEF3F2] border border-[#FECDCA]">
          <span className="text-[12px] font-medium text-[#D92D20]">⚠ Trend error: {trendError}</span>
        </div>
      )}

      {/* Chart — gated only on trendLoading, not summaryLoading */}
      <div className="px-4 pb-2">
        {trendLoading ? (
          <div className="w-full h-[210px] bg-[#F9FAFB] rounded-xl animate-pulse" />
        ) : trendError ? (
          <div className="w-full h-[210px] flex flex-col items-center justify-center gap-2">
            <span className="text-[13px] text-[#667085]">Could not load chart data.</span>
            <span className="text-[11px] text-[#98A2B3]">{trendError}</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-[210px] flex items-center justify-center">
            <span className="text-[13px] text-[#98A2B3]">No collection data for FY{fiscalYear}.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={chartData} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="perfStatsCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#C7D7FE" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#C7D7FE" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="perfStatsSply" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ECFDF3" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#ECFDF3" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F2F4F7" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#98A2B3", fontFamily: "'Outfit', sans-serif" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#98A2B3", fontFamily: "'Outfit', sans-serif" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="current"
                name="Current"
                stroke="#465FFF"
                strokeWidth={2}
                fill="url(#perfStatsCurrent)"
                dot={false}
                activeDot={{ r: 4, fill: "#465FFF" }}
              />
              <Area
                type="monotone"
                dataKey="sply"
                name="SPLY"
                stroke="#00A65D"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                fill="url(#perfStatsSply)"
                dot={false}
                activeDot={{ r: 3, fill: "#00A65D" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
