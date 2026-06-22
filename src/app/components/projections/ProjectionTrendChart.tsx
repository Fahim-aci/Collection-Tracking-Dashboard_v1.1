import { useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { ChevronDown } from "lucide-react";
import { useDateFilter }        from "../../../context/DateFilterContext";
import { useCollectionSummary } from "../../../hooks/useCollectionSummary";
import { useProjectionTrend }   from "../../../hooks/useProjectionTrend";
import type { TrendPoint }      from "../../../hooks/useProjectionTrend";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  'Pharmaceuticals', 'Agribusiness', 'Consumer Brands', 'CC&PH', 'Logistics',
];

const PORTFOLIO_LABELS: Record<string, string> = {
  'Pharmaceuticals': 'Pharma',
  'Agribusiness':    'Agri',
  'Consumer Brands': 'CB',
  'CC&PH':           'CC&PH',
  'Logistics':       'ACI Logistics',
};

type Metric = 'total' | 'credit' | 'cash';

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtAxis(v: number): string {
  if (v === 0) return '0';
  if (v >= 1000) return `${(v / 1000).toFixed(1)}B`;
  return `${v.toFixed(0)}M`;
}

function fmtFull(v: number): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Mn';
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipEntry { name: string; value: number | null; color: string; }

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number | null; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p): p is TooltipEntry => p.value != null && p.value > 0);
  if (!visible.length) return null;
  return (
    <div
      className="bg-white border border-[#E4E7EC] rounded-xl shadow-lg p-3 text-[12px] min-w-[160px]"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <p className="font-semibold text-[#344054] mb-2">{label}</p>
      {visible.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4 mb-0.5">
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-[#667085]">{p.name}</span>
          </div>
          <span className="font-semibold text-[#344054]">{fmtFull(p.value!)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Stat badge ────────────────────────────────────────────────────────────────

function StatBadge({
  label, value, color, loading, extra,
}: {
  label: string; value: number; color: string; loading: boolean; extra?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col">
        {loading ? (
          <div className="h-7 w-24 bg-[#E4E7EC] rounded animate-pulse" />
        ) : (
          <span className="text-[18px] font-bold text-[#1D2939] leading-7">{fmtFull(value)}</span>
        )}
        <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>
      </div>
      {!loading && extra}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getActual(p: TrendPoint, m: Metric) {
  return m === 'total' ? p.actual_total : m === 'credit' ? p.actual_credit : p.actual_cash;
}
function getProj(p: TrendPoint, m: Metric) {
  return m === 'total' ? p.proj_total : m === 'credit' ? p.proj_credit : p.proj_cash;
}
function getSplm(p: TrendPoint, m: Metric) {
  return m === 'total' ? p.splm_total : m === 'credit' ? p.splm_credit : p.splm_cash;
}
function getSply(p: TrendPoint, m: Metric) {
  return m === 'total' ? p.sply_total : m === 'credit' ? p.sply_credit : p.sply_cash;
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProjectionTrendChart({ variant = 'projection' }: { variant?: 'projection' | 'splm' }) {
  const [selectedCat,  setSelectedCat]  = useState<string>("All");
  const [showDropdown, setShowDropdown] = useState(false);
  const [metric,       setMetric]       = useState<Metric>("total");

  const { dateRange } = useDateFilter();

  // SBU rows — provides category list + business IDs for filtering
  const { rows, loading: summaryLoading } = useCollectionSummary(
    dateRange.dateFrom,
    dateRange.dateTo,
  );

  // Ordered category list derived from live data
  const categories = useMemo(() => {
    const fromData = new Set(rows.map(r => r.category).filter(Boolean) as string[]);
    const ordered  = CATEGORY_ORDER.filter(c => fromData.has(c));
    const extras   = [...fromData].filter(c => !CATEGORY_ORDER.includes(c)).sort();
    return ['All', ...ordered, ...extras];
  }, [rows]);

  // Reset if selected category disappears
  useEffect(() => {
    if (selectedCat !== 'All' && !categories.includes(selectedCat)) {
      setSelectedCat('All');
    }
  }, [categories, selectedCat]);

  // Business IDs for the selected category (empty = all)
  const businessIds = useMemo(
    () => selectedCat === 'All'
      ? []
      : rows.filter(r => r.category === selectedCat).map(r => r.business_id),
    [rows, selectedCat],
  );

  const { data, loading: trendLoading, error } = useProjectionTrend(
    dateRange.dateFrom,
    dateRange.dateTo,
    businessIds,
  );

  const loading = summaryLoading || trendLoading;

  // Period-level stat totals from daily trend data
  const stats = useMemo(() => {
    const actual  = data.reduce((s, p) => s + getActual(p, metric), 0);
    const second  = variant === 'splm'
      ? data.reduce((s, p) => s + (getSplm(p, metric) ?? 0), 0)
      : data.reduce((s, p) => s + (getProj(p, metric) ?? 0), 0);
    const sply    = data.reduce((s, p) => s + (getSply(p, metric) ?? 0), 0);
    const achievePct = variant === 'projection' && second > 0
      ? ((actual / second) * 100).toFixed(1)
      : null;
    const splyPct = sply > 0
      ? (((actual - sply) / sply) * 100).toFixed(1)
      : null;
    return { actual, second, sply, achievePct, splyPct };
  }, [data, metric, variant]);

  // Datakey strings for Recharts (looked up by name on each TrendPoint)
  const actualKey  = metric === 'total' ? 'actual_total'  : metric === 'credit' ? 'actual_credit' : 'actual_cash';
  const secondKey  = variant === 'splm'
    ? (metric === 'total' ? 'splm_total'  : metric === 'credit' ? 'splm_credit'  : 'splm_cash')
    : (metric === 'total' ? 'proj_total'  : metric === 'credit' ? 'proj_credit'  : 'proj_cash');
  const splyKey    = metric === 'total' ? 'sply_total'    : metric === 'credit' ? 'sply_credit'   : 'sply_cash';

  // Second-series display config
  const secondLabel = variant === 'splm' ? 'SPLM' : 'Projection';
  const secondColor = variant === 'splm' ? '#7C3AED' : '#F59E0B';
  const secondGrad  = variant === 'splm' ? 'url(#gradSplm)' : 'url(#gradProjection)';

  const catLabel = selectedCat === 'All'
    ? 'ACI Group'
    : (PORTFOLIO_LABELS[selectedCat] ?? selectedCat);

  // Decide x-axis tick density based on range length
  const tickInterval = data.length <= 14 ? 0
                     : data.length <= 31 ? 2
                     : data.length <= 92 ? 6
                     : 'preserveStartEnd';

  return (
    <div
      className="bg-white rounded-2xl border border-[#E4E7EC] w-full"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#E4E7EC]">
        <div>
          <h3 className="text-[17px] font-semibold text-[#1D2939]">Collection Performance</h3>
          <p className="text-[13px] text-[#667085] mt-0.5">
            {catLabel} : {dateRange.dateFrom} To {dateRange.dateTo}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Metric toggle */}
          <div className="flex items-center bg-[#F2F4F7] rounded-lg p-0.5">
            {(['total', 'credit', 'cash'] as Metric[]).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all capitalize ${
                  metric === m
                    ? 'bg-white text-[#344054] shadow-sm'
                    : 'text-[#667085] hover:text-[#344054]'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Category dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(v => !v)}
              className="flex items-center gap-2 h-[36px] px-3.5 border border-[#D0D5DD] rounded-lg text-[13px] text-[#1D2939] bg-white hover:bg-[#F9FAFB] transition-colors shadow-sm"
            >
              {selectedCat === 'All' ? 'All' : (PORTFOLIO_LABELS[selectedCat] ?? selectedCat)}
              <ChevronDown className="size-[14px] text-[#667085]" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-[180px] bg-white border border-[#E4E7EC] rounded-xl shadow-lg z-20 py-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCat(cat); setShowDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-[13px] hover:bg-[#F9FAFB] transition-colors ${
                      cat === selectedCat
                        ? 'text-[#465FFF] font-medium'
                        : 'text-[#344054]'
                    }`}
                  >
                    {cat === 'All' ? 'All (ACI Group)' : (PORTFOLIO_LABELS[cat] ?? cat)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat badges ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-8 px-6 pt-4 pb-3 flex-wrap">
        <StatBadge label="Actual" value={stats.actual} color="#465FFF" loading={loading} />

        {stats.second > 0 && (
          <StatBadge label={secondLabel} value={stats.second} color={secondColor} loading={loading} />
        )}

        <StatBadge
          label="SPLY"
          value={stats.sply}
          color="#00A65D"
          loading={loading}
          extra={stats.splyPct != null ? (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
              parseFloat(stats.splyPct) >= 0
                ? 'bg-[#ECFDF3] text-[#039855]'
                : 'bg-[#FEF3F2] text-[#D92D20]'
            }`}>
              {parseFloat(stats.splyPct) >= 0 ? '+' : ''}{stats.splyPct}%
            </span>
          ) : undefined}
        />

        {stats.achievePct != null && stats.second > 0 && (
          <div className="flex flex-col ml-auto">
            <span className={`text-[18px] font-bold leading-7 ${
              parseFloat(stats.achievePct) >= 100 ? 'text-[#039855]' : 'text-[#D92D20]'
            }`}>
              {stats.achievePct}%
            </span>
            <span className="text-[11px] font-semibold text-[#667085]">Achievement</span>
          </div>
        )}
      </div>

      {/* ── Chart ───────────────────────────────────────────────────────────── */}
      <div className="px-4 pb-5">
        {error && (
          <div className="mb-3 px-4 py-2 rounded-lg bg-[#FEF3F2] border border-[#FECDCA]">
            <span className="text-[12px] font-medium text-[#D92D20]">⚠ {error}</span>
          </div>
        )}

        {loading ? (
          <div className="w-full h-[220px] bg-[#F9FAFB] rounded-xl animate-pulse" />
        ) : data.length === 0 ? (
          <div className="w-full h-[220px] flex items-center justify-center">
            <span className="text-[13px] text-[#98A2B3]">No data for this period.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={data} margin={{ top: 6, right: 12, left: -4, bottom: 0 }}>
              <defs>
                {/* Actual — blue gradient */}
                <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"   stopColor="#465FFF" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#465FFF" stopOpacity={0}    />
                </linearGradient>
                {/* Projection — amber gradient */}
                <linearGradient id="gradProjection" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"   stopColor="#F59E0B" stopOpacity={0.13} />
                  <stop offset="95%"  stopColor="#F59E0B" stopOpacity={0}    />
                </linearGradient>
                {/* SPLM — purple gradient */}
                <linearGradient id="gradSplm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"   stopColor="#7C3AED" stopOpacity={0.13} />
                  <stop offset="95%"  stopColor="#7C3AED" stopOpacity={0}    />
                </linearGradient>
                {/* SPLY — green gradient */}
                <linearGradient id="gradSply" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"   stopColor="#00A65D" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#00A65D" stopOpacity={0}    />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#F2F4F7" strokeDasharray="4 4" vertical={false} />

              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#98A2B3', fontFamily: "'Outfit', sans-serif" }}
                axisLine={false}
                tickLine={false}
                interval={tickInterval}
              />

              <YAxis
                tick={{ fontSize: 11, fill: '#98A2B3', fontFamily: "'Outfit', sans-serif" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtAxis}
                width={52}
              />

              <Tooltip content={<ChartTooltip />} />

              <Legend
                iconType="plainline"
                iconSize={20}
                formatter={(value) => (
                  <span style={{ fontSize: 12, color: '#344054', fontFamily: "'Outfit', sans-serif" }}>
                    {value}
                  </span>
                )}
                wrapperStyle={{ paddingTop: 10 }}
              />

              {/* SPLY — rendered first so it sits behind the others */}
              <Area
                type="monotone"
                dataKey={splyKey}
                name="SPLY"
                stroke="#00A65D"
                strokeWidth={1.5}
                strokeDasharray="2 4"
                fill="url(#gradSply)"
                dot={false}
                activeDot={{ r: 3, fill: '#00A65D', strokeWidth: 0 }}
                connectNulls={false}
              />

              {/* Second series (Projection or SPLM) — middle layer */}
              <Area
                type="monotone"
                dataKey={secondKey}
                name={secondLabel}
                stroke={secondColor}
                strokeWidth={2}
                strokeDasharray="7 4"
                fill={secondGrad}
                dot={false}
                activeDot={{ r: 4, fill: secondColor, strokeWidth: 0 }}
                connectNulls={false}
              />

              {/* Actual — solid, on top */}
              <Area
                type="monotone"
                dataKey={actualKey}
                name="Actual"
                stroke="#465FFF"
                strokeWidth={2}
                fill="url(#gradActual)"
                dot={false}
                activeDot={{ r: 4, fill: '#465FFF', strokeWidth: 0 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
