import { useState, useEffect } from "react";
import { usePeriodTotals } from "../../../hooks/usePeriodTotals";
import { useDateFilter } from "../../../context/DateFilterContext";
import { supabase } from "../../../lib/supabaseClient";
import svgPaths from "../../../imports/DivSpaceY6/svg-2gkdxw118h";

// ── Three-dot icon (from Figma SVG asset) ────────────────────────────────────
function DotsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        clipRule="evenodd"
        d={svgPaths.p3316b480}
        fill="#98A2B3"
        fillRule="evenodd"
      />
    </svg>
  );
}

// ── Semi-circle gauge ─────────────────────────────────────────────────────────
function GaugeChart({ pct }: { pct: number }) {
  // Geometry: R=130, centre at (200, 175), arcs from 180° → 0° (upward semicircle)
  const R = 130;
  const cx = 200;
  const cy = 175;

  const toRad = (d: number) => (d * Math.PI) / 180;

  // Fixed start / end points
  const sx = cx - R; // 70
  const sy = cy; // 175
  const ex = cx + R; // 330
  const ey = cy; // 175

  // Track path — full 180°
  const track = `M ${sx} ${sy} A ${R} ${R} 0 0 1 ${ex} ${ey}`;

  // Fill path — clamped 0–100 → 0–180°
  const clamp = Math.min(Math.max(pct, 0), 100);
  const fillAng = (clamp / 100) * 180;
  const fillRad = toRad(180 - fillAng); // 180° = left, 0° = right (CSS/SVG coords)
  const fx = cx + R * Math.cos(fillRad);
  const fy = cy - R * Math.sin(fillRad); // SVG y-axis is inverted
  const largeArc = fillAng > 180 ? 1 : 0;
  const fill = `M ${sx} ${sy} A ${R} ${R} 0 ${largeArc} 1 ${fx} ${fy}`;

  return (
    <div
      className="w-full flex justify-center"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <svg
        viewBox="0 0 400 200"
        width="100%"
        style={{ maxHeight: 200 }}
        overflow="visible"
      >
        {/* Track */}
        <path
          d={track}
          fill="none"
          stroke="#E4E7EC"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={fill}
          fill="none"
          stroke="#027A48"
          strokeWidth="14"
          strokeLinecap="round"
        />

        {/* Centre label */}
        <text
          x={cx}
          y={cy - 30}
          textAnchor="middle"
          fontSize="13"
          fill="#667085"
          fontFamily="'Outfit', sans-serif"
          fontWeight="600"
        >
          ACI Group Achievement
        </text>

        {/* Big percentage */}
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fontSize="38"
          fill="#344054"
          fontFamily="'Outfit', sans-serif"
          fontWeight="700"
        >
          {clamp.toFixed(0)}%
        </text>
      </svg>
    </div>
  );
}

// ── Single metric row (Figma layout) ─────────────────────────────────────────
//
//   Total Cash
//   BDT 30,569.00          [====------]  55%
//
function MetricRow({
  label,
  amount,
  pct,
}: {
  label: string;
  amount: number;
  pct: number;
}) {
  const clamp = Math.min(Math.max(pct, 0), 100);

  const display = (v: number) => {
    if (v >= 1000) return (v / 1000).toFixed(2) + "B";
    return (
      v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + "M"
    );
  };

  return (
    <div className="flex flex-col gap-[8px]">
      {/* Label */}
      <p
        className="text-[13px] font-semibold text-[#667085]"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        {label}
      </p>

      {/* Amount row */}
      <div className="flex items-center justify-between">
        {/* Amount */}
        <span
          className="text-[13px] text-[#1D2939] whitespace-nowrap"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
          }}
        >
          {amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Mn
        </span>

        {/* Progress bar + pct */}
        <div className="flex items-center gap-[12px]">
          <div
            className="relative rounded-[4px] shrink-0"
            style={{
              width: 100,
              height: 8,
              background: "#E4E7EC",
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-[4px]"
              style={{
                width: `${clamp}%`,
                background: "#00A65D",
              }}
            />
          </div>
          <span
            className="text-[13px] text-[#344054] whitespace-nowrap"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
            }}
          >
            {clamp.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProjectionVsCollection() {
  const { dateRange } = useDateFilter();
  const { totals, loading, error } = usePeriodTotals(
    dateRange.dateFrom,
    dateRange.dateTo,
  );

  // ── Projection targets from business_projections for the active date range ─
  const [projTotal,  setProjTotal]  = useState(0);
  const [projCredit, setProjCredit] = useState(0);
  const [projCash,   setProjCash]   = useState(0);

  useEffect(() => {
    if (!dateRange.dateFrom || !dateRange.dateTo) return;
    let cancelled = false;
    supabase
      .from('business_projections')
      .select('total_target, credit_target, cash_target')
      .gte('projection_date', dateRange.dateFrom)
      .lte('projection_date', dateRange.dateTo)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = data ?? [];
        setProjTotal( rows.reduce((s, r) => s + (r.total_target  ?? 0), 0));
        setProjCredit(rows.reduce((s, r) => s + (r.credit_target ?? 0), 0));
        setProjCash(  rows.reduce((s, r) => s + (r.cash_target   ?? 0), 0));
      });
    return () => { cancelled = true; };
  }, [dateRange.dateFrom, dateRange.dateTo]);

  // ── Cash Total = cash_amount + deposit_amount ─────────────────────────────
  const cashTotal   = totals?.total_cash_and_deposit ?? 0;
  const creditTotal = totals?.total_credit ?? 0;
  const grandTotal  = totals?.grand_total  ?? 0;

  // Achievement % vs live projection targets
  const gaugePct  = projTotal  > 0 ? (grandTotal  / projTotal)  * 100 : 0;
  const cashPct   = projCash   > 0 ? (cashTotal   / projCash)   * 100 : 0;
  const creditPct = projCredit > 0 ? (creditTotal / projCredit) * 100 : 0;

  return (
    <div
      className="bg-white rounded-2xl border border-[#E4E7EC] w-full"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* ── Card header — UNCHANGED ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E4E7EC]">
        <div>
          <h3 className="text-[15px] font-semibold text-[#1D2939]">
            Collection to Date
          </h3>
          <p className="text-[11px] text-[#667085] mt-0.5">
            Actual Performance Summary
          </p>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="px-[25px] pt-[4px] pb-[25px]">
        {error && (
          <p className="text-[11px] text-[#D92D20] mb-2">
            ⚠ {error}
          </p>
        )}

        {/* Gauge */}
        {loading ? (
          <div className="w-full h-[185px] bg-[#F9FAFB] rounded-xl animate-pulse" />
        ) : (
          <GaugeChart pct={gaugePct} />
        )}

        {/* ── Metrics (below divider) ─────────────────────────────────────── */}
        <div className="relative mt-4">
          {/* Top border */}
          <div className="border-t border-[#E4E7EC] mb-[27px]" />

          <div className="flex flex-col gap-[20px]">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 animate-pulse"
                >
                  <div className="h-3 w-20 bg-[#E4E7EC] rounded" />
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-28 bg-[#E4E7EC] rounded" />
                    <div className="h-2 w-24 bg-[#E4E7EC] rounded" />
                  </div>
                </div>
              ))
            ) : (
              <>
                <MetricRow
                  label="Cash"
                  amount={cashTotal}
                  pct={cashPct}
                />
                <MetricRow
                  label="Credit"
                  amount={creditTotal}
                  pct={creditPct}
                />
                <MetricRow
                  label="Total Collection"
                  amount={grandTotal}
                  pct={gaugePct}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}