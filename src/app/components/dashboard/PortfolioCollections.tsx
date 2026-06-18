import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { useDateFilter }           from "../../../context/DateFilterContext";
import { useCollectionSummary }    from "../../../hooks/useCollectionSummary";
import { usePortfolios, type Portfolio } from "../../../hooks/usePortfolios";

// Card width (360px) + gap (16px) — used to calculate seek offset for buttons
const CARD_STRIDE = 376;

function formatM(val: number) {
  if (val >= 1000) return (val / 1000).toFixed(1) + "B";
  return val.toFixed(0) + "M";
}

function PortfolioCard({ portfolio }: { portfolio: Portfolio }) {
  const isPositive = portfolio.growthPct >= 0;

  return (
    <div
      className="flex-shrink-0 w-[360px] rounded-2xl p-5 border border-[#E4E7EC]"
      style={{ backgroundColor: portfolio.bgColor }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#E4E7EC]">
        <div className="flex items-center gap-3">
          <div
            className="size-[40px] rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
            style={{ backgroundColor: portfolio.color }}
          >
            {portfolio.initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-semibold text-[#1D2939] leading-6 truncate">{portfolio.name}</span>
            <span className="text-[11px] font-normal text-[#667085] leading-[18px] truncate">{portfolio.subtitle}</span>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0 ml-3">
          <span className="text-[14px] font-medium text-[#344054] leading-5">
            {portfolio.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Mn
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            {isPositive
              ? <TrendingUp   className="size-[11px] text-[#039855]" />
              : <TrendingDown className="size-[11px] text-[#D92D20]" />
            }
            <span className={`text-[11px] font-medium ${isPositive ? 'text-[#039855]' : 'text-[#D92D20]'}`}>
              {isPositive ? '+' : ''}{portfolio.growthPct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* SPLY / SPLM badges */}
      <div className="flex gap-3">
        <button className="flex-1 bg-white border border-[#D0D5DD] rounded-lg py-2.5 text-[13px] font-medium text-[#039855] text-center shadow-sm hover:bg-[#F9FAFB] transition-colors">
          +{Math.abs(portfolio.growthPct).toFixed(1)}% SPLY
        </button>
        <button className="flex-1 bg-white border border-[#D0D5DD] rounded-lg py-2.5 text-[13px] font-medium text-[#D92D20] text-center shadow-sm hover:bg-[#F9FAFB] transition-colors">
          -{(Math.abs(portfolio.growthPct) * 0.4).toFixed(1)}% SPLM
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[360px] rounded-2xl p-5 border border-[#E4E7EC] bg-[#F9FAFB] animate-pulse">
      <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#E4E7EC]">
        <div className="flex items-center gap-3">
          <div className="size-[40px] rounded-full bg-[#E4E7EC] shrink-0" />
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-28 bg-[#E4E7EC] rounded" />
            <div className="h-3 w-36 bg-[#E4E7EC] rounded" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 ml-3">
          <div className="h-4 w-16 bg-[#E4E7EC] rounded" />
          <div className="h-3 w-12 bg-[#E4E7EC] rounded" />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1 h-[42px] bg-[#E4E7EC] rounded-lg" />
        <div className="flex-1 h-[42px] bg-[#E4E7EC] rounded-lg" />
      </div>
    </div>
  );
}

export function PortfolioCollections() {
  // Pixel offset accumulated by button clicks — converted to animation-delay seek
  const [seekPx, setSeekPx] = useState(0);

  const { dateRange }            = useDateFilter();
  const { rows, loading, error } = useCollectionSummary(dateRange.dateFrom, dateRange.dateTo);
  const portfolios               = usePortfolios(rows);

  // Duration scales with number of cards (5 s per card, min 20 s)
  const duration = Math.max(portfolios.length * 10, 20);

  // Half-track width in px (one full set of cards) — used for seek wrapping
  const halfTrackPx = Math.max(portfolios.length * CARD_STRIDE, CARD_STRIDE);

  // Negative animation-delay seeks the animation forward to seekPx
  const delayS = portfolios.length > 0
    ? -((seekPx % halfTrackPx) / halfTrackPx) * duration
    : 0;

  // Buttons shift seekPx by one card stride; wrap within [0, halfTrackPx)
  const scroll = (dir: 'left' | 'right') => {
    setSeekPx(prev => {
      const next = prev + (dir === 'left' ? -CARD_STRIDE : CARD_STRIDE);
      return ((next % halfTrackPx) + halfTrackPx) % halfTrackPx;
    });
  };

  return (
    <div
      className="bg-white rounded-2xl border border-[#E4E7EC] w-full overflow-hidden"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#E4E7EC]">
        <div>
          <h3 className="text-[17px] font-semibold text-[#1D2939]">Portfolio Synopsis</h3>
          <p className="text-[11px] text-[#667085] mt-0.5">Achievement to Date</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="flex items-center justify-center size-[32px] rounded-full border border-[#E4E7EC] bg-white hover:bg-[#F9FAFB] text-[#344054] transition-colors"
          >
            <ChevronLeft className="size-[14px]" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="flex items-center justify-center size-[32px] rounded-full border border-[#E4E7EC] bg-white hover:bg-[#F9FAFB] text-[#344054] transition-colors"
          >
            <ChevronRight className="size-[14px]" />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-3 px-4 py-2.5 rounded-lg bg-[#FEF3F2] border border-[#FECDCA]">
          <span className="text-[12px] font-medium text-[#D92D20]">⚠ Failed to load portfolio data: {error}</span>
        </div>
      )}

      {/* Viewport — clips the sliding track; group enables hover-pause on the track */}
      <div className="overflow-hidden group">
        {loading ? (
          <div className="flex gap-4 px-6 py-5">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div
            className="flex gap-4 px-6 py-5 w-max animate-portfolio-scroll group-hover:[animation-play-state:paused]"
            style={{
              animationDuration: `${duration}s`,
              animationDelay:    `${delayS}s`,
            }}
          >
            {/* Cards duplicated twice — animation translates -50% for a seamless loop */}
            {[...portfolios, ...portfolios].map((p, i) => (
              <PortfolioCard key={`${p.id}-${i}`} portfolio={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
