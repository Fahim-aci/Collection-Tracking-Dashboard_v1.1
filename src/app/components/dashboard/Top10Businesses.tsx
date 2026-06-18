import { TrendingUp, TrendingDown } from "lucide-react";
import { useDateFilter } from "../../../context/DateFilterContext";
import { useCollectionSummary } from "../../../hooks/useCollectionSummary";

// Category → colour map matching the design palette
const categoryColors: Record<
  string,
  { bg: string; text: string; initials: string }
> = {
  Pharma: { bg: "#ECFDF3", text: "#00A65D", initials: "PH" },
  Motors: { bg: "#FEF3F2", text: "#E91922", initials: "MT" },
  Consumer: { bg: "#EEF2FF", text: "#465FFF", initials: "CB" },
  FMCG: { bg: "#FFFAEB", text: "#F79009", initials: "FM" },
  Industrial: {
    bg: "#F0F9FF",
    text: "#0284C7",
    initials: "IN",
  },
  Agri: { bg: "#F0FDF4", text: "#16A34A", initials: "AG" },
  "Animal Health": {
    bg: "#FFF7ED",
    text: "#EA580C",
    initials: "AH",
  },
  Marine: { bg: "#EFF6FF", text: "#2563EB", initials: "MR" },
  Energy: { bg: "#FEF9C3", text: "#CA8A04", initials: "EN" },
  Healthcare: {
    bg: "#FCE7F3",
    text: "#DB2777",
    initials: "HC",
  },
  Education: { bg: "#EDE9FE", text: "#7C3AED", initials: "ED" },
  Sales: { bg: "#F1F5F9", text: "#475569", initials: "SL" },
};

function BusinessLogo({
  name,
  category,
}: {
  name: string;
  category: string;
}) {
  const style = categoryColors[category] ?? {
    bg: "#F1F5F9",
    text: "#475569",
    initials: name.slice(0, 2).toUpperCase(),
  };
  return (
    <div
      className="size-[36px] rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.initials}
    </div>
  );
}

function formatAmt(v: number) {
  if (v >= 1000) return "BDT " + (v / 1000).toFixed(2) + "B";
  return (
    "BDT " +
    v.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) +
    "M"
  );
}

export function Top10Businesses() {
  const { dateRange } = useDateFilter();
  const { rows, loading, error } = useCollectionSummary(
    dateRange.dateFrom,
    dateRange.dateTo,
  );

  return (
    <div
      className="bg-white rounded-2xl border border-[#E4E7EC] w-full"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E4E7EC]">
        <div>
          <h3 className="text-[15px] font-semibold text-[#1D2939]">
            All SBUs
          </h3>
          <p className="text-[11px] text-[#667085] mt-0.5">
            In order of Achievement
          </p>
        </div>
      </div>

      {/* Inline error */}
      {error && (
        <div className="px-5 py-2">
          <span className="text-[11px] font-medium text-[#D92D20]">
            ⚠ {error}
          </span>
        </div>
      )}

      <div className="overflow-y-auto" style={{ maxHeight: "920px" }}>
      <div className="flex flex-col divide-y divide-[#F2F4F7]">
        {loading
          ? // ── Skeleton rows ────────────────────────────────────────────────
            Array.from({ length: 55 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-3 animate-pulse"
              >
                {/* Left: rank + avatar + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-4 h-3 bg-[#E4E7EC] rounded shrink-0" />
                  <div className="size-[36px] rounded-full bg-[#E4E7EC] shrink-0" />
                  <div className="h-3.5 w-32 bg-[#E4E7EC] rounded" />
                </div>
                {/* Right: amount + growth */}
                <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                  <div className="h-3.5 w-20 bg-[#E4E7EC] rounded" />
                  <div className="h-3 w-12 bg-[#E4E7EC] rounded" />
                </div>
              </div>
            ))
          : // ── Live rows ─────────────────────────────────────────────────────
            rows.map((biz, idx) => {
              const isPositive = (biz.growth_pct ?? 0) >= 0;
              return (
                <div
                  key={biz.business_id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-[#F9FAFB] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[11px] font-semibold text-[#98A2B3] w-4 shrink-0">
                      {idx + 1}
                    </span>
                    <BusinessLogo
                      name={biz.business_name}
                      category={biz.category ?? ""}
                    />
                    <span className="text-[13px] font-medium text-[#344054] truncate">
                      {biz.business_name}
                    </span>
                  </div>

                  <div className="flex flex-col items-end shrink-0 ml-2">
                    <span className="text-[13px] font-semibold text-[#1D2939] whitespace-nowrap">
                      {biz.total_amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Mn
                    </span>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {isPositive ? (
                        <TrendingUp className="size-[10px] text-[#039855]" />
                      ) : (
                        <TrendingDown className="size-[10px] text-[#D92D20]" />
                      )}
                      <span
                        className={`text-[11px] font-medium ${isPositive ? "text-[#039855]" : "text-[#D92D20]"}`}
                      >
                        {isPositive ? "+" : ""}
                        {(biz.growth_pct ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
      </div>
    </div>
  );
}