import { useState, useEffect } from "react";
import { useDateFilter }    from "../../../context/DateFilterContext";
import { usePeriodTotals } from "../../../hooks/usePeriodTotals";
import { getSplmRange }    from "../../../lib/datePresets";
import { supabase }        from "../../../lib/supabaseClient";

type Period = "Weekly" | "Monthly" | "Yearly";

function formatM(val: number) {
  return val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + "M";
}

// Scale factor: Weekly ≈ /39, Monthly ≈ /9, Yearly = full 9M data * ~1.33
const scaleFactors: Record<Period, number> = { Weekly: 1 / 52, Monthly: 1 / 12, Yearly: 1 };

interface KpiCardProps {
  label: string;
  value: number;
  splmRatio: number | null;  // curr / splm  (same formula as BusinessUnitDetailsTable ratio())
  splyRatio: number | null;  // curr / sply
  showProjection?: boolean;
  creditSub?: number;
  cashSub?: number;
  loading?: boolean;
}

function RatioBadge({ ratio, label }: { ratio: number | null; label: string }) {
  if (ratio === null) {
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-[#F2F4F7] text-[#667085]">
        — {label}
      </span>
    );
  }
  const isGood = ratio >= 1;
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
      isGood ? 'bg-[#ECFDF3] text-[#039855]' : 'bg-[#FEF3F2] text-[#D92D20]'
    }`}>
      {ratio.toFixed(2)}x {label}
    </span>
  );
}

function KpiCard({ label, value, splmRatio, splyRatio, showProjection, creditSub, cashSub, loading }: KpiCardProps) {
  const display = (v: number) => {
    if (v >= 1000) return (v / 1000).toFixed(2) + "B";
    return formatM(v);
  };

  return (
    <div className="flex flex-col gap-1 py-5 px-6 border-r border-[#E4E7EC] last:border-r-0 min-w-0 flex-1">
      <span className="text-[13px] font-semibold text-[#667085] leading-5">{label}</span>
      <div className="flex items-center gap-3 flex-wrap">

        {/* ── Main value or skeleton ── */}
        {loading ? (
          <div className="h-8 w-28 bg-[#E4E7EC] rounded-lg animate-pulse" />
        ) : (
          <span className="text-[24px] font-bold text-[#1D2939] leading-none whitespace-nowrap">
            {value.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mn
          </span>
        )}

        {/* ── Badges or skeleton badges ── */}
        {loading ? (
          <div className="flex flex-col gap-1">
            <div className="h-5 w-16 bg-[#E4E7EC] rounded-full animate-pulse" />
            <div className="h-5 w-16 bg-[#E4E7EC] rounded-full animate-pulse" />
          </div>
        ) : showProjection ? (
          <div className="flex flex-col gap-1">
            <span className="bg-[#ECFDF3] text-[#039855] text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
              Credit {creditSub ? display(creditSub) : "–"}
            </span>
            <span className="bg-[#FEF3F2] text-[#D92D20] text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
              Cash {cashSub ? display(cashSub) : "–"}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <RatioBadge ratio={splmRatio} label="SPLM" />
            <RatioBadge ratio={splyRatio} label="SPLY" />
          </div>
        )}

      </div>
    </div>
  );
}

export function KpiCards() {
  // ── Local UI state (Weekly / Monthly / Yearly toggle) ─────────────────────
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("Yearly");
  const sf = scaleFactors[selectedPeriod];

  // ── Live data from Supabase ───────────────────────────────────────────────
  const { dateRange }              = useDateFilter();
  const { totals, loading, error } = usePeriodTotals(dateRange.dateFrom, dateRange.dateTo);

  // ── SPLM: same date range shifted back 1 month ────────────────────────────
  const splmRange                          = getSplmRange(dateRange);
  const { totals: splmTotals, loading: splmLoading } =
    usePeriodTotals(splmRange.dateFrom, splmRange.dateTo);

  // ── Projection totals from business_projections ───────────────────────────
  const [projCredit,  setProjCredit]  = useState(0);
  const [projCash,    setProjCash]    = useState(0);
  const [projTotal,   setProjTotal]   = useState(0);
  const [projLoading, setProjLoading] = useState(false);

  useEffect(() => {
    if (!dateRange.dateFrom || !dateRange.dateTo) return;
    setProjLoading(true);
    supabase
      .from('business_projections')
      .select('credit_target, cash_target, total_target')
      .gte('projection_date', dateRange.dateFrom)
      .lte('projection_date', dateRange.dateTo)
      .then(({ data }) => {
        const rows = data ?? [];
        const credit = rows.reduce((s, r) => s + (r.credit_target ?? 0), 0);
        const cash   = rows.reduce((s, r) => s + (r.cash_target   ?? 0), 0);
        const total  = rows.reduce((s, r) => s + (r.total_target  ?? 0), 0);
        setProjCredit(credit * sf);
        setProjCash(cash   * sf);
        setProjTotal(total  * sf);
        setProjLoading(false);
      });
  }, [dateRange.dateFrom, dateRange.dateTo, sf]);

  // ── Safe scaled values ────────────────────────────────────────────────────
  const curr = {
    total:  (totals?.grand_total          ?? 0) * sf,
    credit: (totals?.total_credit         ?? 0) * sf,
    cash:   (totals?.total_cash_and_deposit ?? 0) * sf,
  };
  const sply = {
    total:  (totals?.sply_grand_total ?? 0) * sf,
    credit: (totals?.sply_credit      ?? 0) * sf,
    cash:   ((totals?.sply_cash ?? 0) + (totals?.sply_deposit ?? 0)) * sf,
  };
  const splm = {
    total:  (splmTotals?.grand_total          ?? 0) * sf,
    credit: (splmTotals?.total_credit         ?? 0) * sf,
    cash:   (splmTotals?.total_cash_and_deposit ?? 0) * sf,
  };

  const isLoading = loading || splmLoading;

  // ── Grand growth ratios — curr/prev, matching BusinessUnitDetailsTable logic ─
  // sf cancels in division, so ratios are period-toggle-independent (correct)
  const r = (a: number, b: number): number | null => b > 0 ? a / b : null;

  const splmRatioTotal  = r(curr.total,  splm.total);
  const splmRatioCredit = r(curr.credit, splm.credit);
  const splmRatioCash   = r(curr.cash,   splm.cash);
  const splyRatioTotal  = r(curr.total,  sply.total);
  const splyRatioCredit = r(curr.credit, sply.credit);
  const splyRatioCash   = r(curr.cash,   sply.cash);

  return (
    <div
      className="bg-white rounded-2xl border border-[#E4E7EC] w-full"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#E4E7EC]">
        <div className="flex items-center gap-3">
          <h2 className="text-[17px] font-semibold text-[#1D2939]">Group Collection Synopsis</h2>
          {error && (
            <span className="text-[11px] font-medium text-[#D92D20]">
              ⚠ {error}
            </span>
          )}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-4 divide-x divide-[#E4E7EC]">
        <KpiCard label="Total Collection" value={curr.total}  splmRatio={splmRatioTotal}  splyRatio={splyRatioTotal}  loading={isLoading} />
        <KpiCard label="Credit"           value={curr.credit} splmRatio={splmRatioCredit} splyRatio={splyRatioCredit} loading={isLoading} />
        <KpiCard label="Cash"             value={curr.cash}   splmRatio={splmRatioCash}   splyRatio={splyRatioCash}   loading={isLoading} />
        <KpiCard
          label="Projection"
          value={projTotal}
          splmRatio={splmRatioTotal}
          splyRatio={splyRatioTotal}
          showProjection
          creditSub={projCredit}
          cashSub={projCash}
          loading={projLoading}
        />
      </div>
    </div>
  );
}
