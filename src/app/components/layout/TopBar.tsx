import { useState, useRef, useEffect, type ReactNode } from "react";
import { Search, Moon, ChevronDown, Calendar, X, LogOut } from "lucide-react";
import svgPaths from "../../../imports/svg-s8mivaat72";
import { useDateFilter }       from "../../../context/DateFilterContext";
import { PRESET_LABELS, type PresetKey } from "../../../lib/datePresets";
import { useAuth } from "../../../context/AuthContext";

// ── Preset keys to show as quick-access buttons in the bar ───────────────────
const QUICK_PRESETS: PresetKey[] = ["today", "wtd", "mtd", "qtd", "ytd"];

// ── Module-level date helpers ─────────────────────────────────────────────────

function fmtISO(y: number, m: number, d: number): string {
  return (
    y +
    "-" +
    String(m + 1).padStart(2, "0") +
    "-" +
    String(d).padStart(2, "0")
  );
}

function fmtDisplay(s: string): string {
  if (!s) return "—";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTodayStr(): string {
  const t = new Date();
  return fmtISO(t.getFullYear(), t.getMonth(), t.getDate());
}

// ── UserAvatar ────────────────────────────────────────────────────────────────

function UserAvatar() {
  return (
    <div className="relative shrink-0 size-[36px]">
      <svg
        className="absolute block inset-0 size-full"
        fill="none"
        viewBox="0 0 44 44"
      >
        <path d={svgPaths.p1242e200} fill="#E91922" />
        <path d={svgPaths.p71eebf0} fill="#FEFEFE" />
        <path d={svgPaths.pb5fd500} fill="#E91922" />
        <path d={svgPaths.p2fd66e00} fill="#FEFEFE" />
        <path d={svgPaths.p9089380} fill="#E91922" />
      </svg>
    </div>
  );
}

// ── Custom date-range popover ─────────────────────────────────────────────────

interface CustomRangePickerProps {
  currentFrom: string;
  currentTo: string;
  onApply: (from: string, to: string) => void;
  onClose: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = [ "Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"];

function CustomRangePicker({
  currentFrom,
  currentTo,
  onApply,
  onClose,
}: CustomRangePickerProps) {
  const todayStr = getTodayStr();

  const [from, setFrom] = useState<string>(currentFrom);
  const [to, setTo] = useState<string>(currentTo);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pickingFrom, setPickingFrom] = useState<boolean>(!currentFrom);
  const [err, setErr] = useState<string>("");

  // Initialise the left calendar month
  const initDate = currentFrom
    ? new Date(currentFrom + "T00:00:00")
    : new Date();
  const initMonth = initDate.getMonth();
  const initYear = initDate.getFullYear();

  const [leftYear, setLeftYear] = useState<number>(initYear);
  const [leftMonth, setLeftMonth] = useState<number>(
    initMonth === 0 ? 0 : initMonth - 1
  );

  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1;
  const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear;

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  function prevMonth() {
    if (leftMonth === 0) {
      setLeftMonth(11);
      setLeftYear((y) => y - 1);
    } else {
      setLeftMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (leftMonth === 11) {
      setLeftMonth(0);
      setLeftYear((y) => y + 1);
    } else {
      setLeftMonth((m) => m + 1);
    }
  }

  function handleDay(dateStr: string) {
    setErr("");
    if (pickingFrom) {
      setFrom(dateStr);
      setTo("");
      setPickingFrom(false);
    } else {
      if (!from || dateStr < from) {
        setFrom(dateStr);
        setTo("");
        setPickingFrom(false);
      } else {
        setTo(dateStr);
      }
    }
  }

  function handleApply() {
    if (!from || !to) {
      setErr("Please select both a start and an end date.");
      return;
    }
    onApply(from, to);
    onClose();
  }

  function getDayClass(dateStr: string): string {
    const isStart = dateStr === from;
    const isEnd = dateStr === to;

    // Hover preview: show range from `from` to hovered when `to` not yet set
    const effectiveTo = to || (hovered && hovered >= from ? hovered : "");

    const inRange =
      from && effectiveTo && dateStr > from && dateStr < effectiveTo;
    const isToday = dateStr === todayStr;

    if (isStart || isEnd) {
      return "bg-[#00A65D] text-white font-bold shadow-md";
    }
    if (inRange) {
      return "bg-[#DCFCE7] text-[#065F46]";
    }
    if (isToday) {
      return "text-[#00A65D] ring-2 ring-[#00A65D] ring-offset-1";
    }
    return "text-[#344054] hover:bg-[#F2F4F7]";
  }

  function hasRightHalfFill(dateStr: string): boolean {
    // Extend range band to the right of the start dot
    if (dateStr !== from) return false;
    if (!to && (!hovered || hovered <= from)) return false;
    const effectiveTo = to || hovered || "";
    return effectiveTo > from;
  }

  function hasLeftHalfFill(dateStr: string): boolean {
    // Extend range band to the left of the end dot
    if (dateStr !== to) return false;
    return !!from && from < to;
  }

  function isInRangeBand(dateStr: string): boolean {
    const effectiveTo = to || (hovered && hovered >= from ? hovered : "");
    return !!(from && effectiveTo && dateStr > from && dateStr < effectiveTo);
  }

  function renderMonth(year: number, month: number): ReactNode {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMo = new Date(year, month + 1, 0).getDate();

    const cells: ReactNode[] = [];

    // Empty leading cells
    for (let i = 0; i < firstDow; i++) {
      cells.push(<div key={"e" + i} />);
    }

    // Day cells
    for (let d = 1; d <= daysInMo; d++) {
      const ds = fmtISO(year, month, d);
      const dayClass = getDayClass(ds);
      const rightHalf = hasRightHalfFill(ds);
      const leftHalf = hasLeftHalfFill(ds);
      const inBand = isInRangeBand(ds);

      cells.push(
        <div
          key={ds}
          className="relative flex items-center justify-center h-8"
        >
          {inBand && (
            <div className="absolute inset-y-0 left-0 right-0 bg-[#DCFCE7]" />
          )}
          {rightHalf && (
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[#DCFCE7]" />
          )}
          {leftHalf && (
            <div className="absolute inset-y-0 left-0 w-1/2 bg-[#DCFCE7]" />
          )}
          <button
            onClick={() => handleDay(ds)}
            onMouseEnter={() => setHovered(ds)}
            onMouseLeave={() => setHovered(null)}
            className={
              "relative z-10 size-8 rounded-full text-[12px] font-medium flex items-center justify-center transition-all " +
              dayClass
            }
          >
            {d}
          </button>
        </div>
      );
    }

    return (
      <div className="w-[220px]">
        <p className="text-[13px] font-semibold text-[#344054] text-center mb-3">
          {MONTHS[month]} {year}
        </p>
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map((dn) => (
            <div
              key={dn}
              className="h-7 flex items-center justify-center text-[10px] font-bold text-[#98A2B3] uppercase"
            >
              {dn}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">{cells}</div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 z-50 bg-white border border-[#E4E7EC] rounded-2xl shadow-2xl p-5"
      style={{ width: 520 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-semibold text-[#344054]">
          Select Date Range
        </p>
        <button
          onClick={onClose}
          className="size-6 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] transition-colors"
        >
          <X className="size-3.5 text-[#667085]" />
        </button>
      </div>

      {/* From / To indicator pills */}
      <div className="flex items-stretch gap-2 mb-4">
        <button
          onClick={() => {
            setPickingFrom(true);
            setTo("");
          }}
          className={
            "flex-1 flex flex-col items-center py-2 px-3 rounded-xl border-2 transition-all " +
            (pickingFrom
              ? "border-[#00A65D] bg-[#F0FDF4]"
              : "border-[#E4E7EC] bg-[#F8FAFC] hover:border-[#98A2B3]")
          }
        >
          <span className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-widest mb-0.5">
            From
          </span>
          <span
            className={
              "text-[12px] font-semibold " +
              (from ? "text-[#00A65D]" : "text-[#D0D5DD]")
            }
          >
            {fmtDisplay(from)}
          </span>
        </button>

        <div className="flex items-center text-[#D0D5DD] text-lg select-none">
          →
        </div>

        <button
          onClick={() => {
            if (from) setPickingFrom(false);
          }}
          className={
            "flex-1 flex flex-col items-center py-2 px-3 rounded-xl border-2 transition-all " +
            (!pickingFrom && !to
              ? "border-[#00A65D] bg-[#F0FDF4]"
              : "border-[#E4E7EC] bg-[#F8FAFC] hover:border-[#98A2B3]")
          }
        >
          <span className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-widest mb-0.5">
            To
          </span>
          <span
            className={
              "text-[12px] font-semibold " +
              (to ? "text-[#00A65D]" : "text-[#D0D5DD]")
            }
          >
            {fmtDisplay(to)}
          </span>
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          onClick={prevMonth}
          className="size-7 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] transition-colors text-[#667085] text-lg leading-none"
        >
          ‹
        </button>
        <div className="flex-1" />
        <button
          onClick={nextMonth}
          className="size-7 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] transition-colors text-[#667085] text-lg leading-none"
        >
          ›
        </button>
      </div>

      {/* Two calendars side by side */}
      <div className="flex gap-4 items-start">
        {renderMonth(leftYear, leftMonth)}
        <div className="w-px self-stretch bg-[#E4E7EC] mx-1" />
        {renderMonth(rightYear, rightMonth)}
      </div>

      {/* Hint / error line */}
      <p
        className={
          "text-[11px] mt-3 min-h-[16px] " +
          (err ? "text-[#D92D20]" : "text-[#98A2B3]")
        }
      >
        {err
          ? err
          : pickingFrom
          ? "① Click a day to set the start date"
          : !to
          ? "② Now click a day to set the end date"
          : ""}
      </p>

      {/* Apply button */}
      <button
        onClick={handleApply}
        disabled={!from || !to}
        className="w-full mt-3 h-[38px] bg-[#00A65D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#009954] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Apply Range
      </button>
    </div>
  );
}

// ── Main TopBar ───────────────────────────────────────────────────────────────

export function TopBar() {
  const { preset, dateRange, rangeLabel, setPreset, setCustomRange } =
    useDateFilter();
  const [showCustom, setShowCustom] = useState(false);
  const { displayName, user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  return (
    <header
      className="sticky top-0 z-30 flex flex-col bg-white border-b border-[#E4E7EC] shrink-0"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* ── Row 1: search + user ── */}
      <div className="flex items-center justify-between px-6 h-[64px]">
        {/* Left: search */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] size-[16px]" />
            <input
              type="text"
              placeholder="Search or type command..."
              className="h-[38px] w-[280px] pl-9 pr-12 text-[13px] text-[#98A2B3] border border-[#E4E7EC] rounded-lg bg-white outline-none focus:border-[#00A65D] transition-colors placeholder:text-[#98A2B3]"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5 bg-[#F9FAFB] border border-[#E4E7EC] rounded px-1.5 py-0.5">
              <span className="text-[11px] text-[#667085]">⌘</span>
              <span className="text-[11px] text-[#667085]">K</span>
            </div>
          </div>
        </div>

        {/* Right: dark mode + user */}
        <div className="flex items-center gap-3">
          <button className="flex items-center justify-center size-[38px] rounded-full border border-[#E4E7EC] bg-white hover:bg-[#F9FAFB] transition-colors">
            <Moon className="size-[16px] text-[#B6B6B6]" />
          </button>
          <div className="relative" ref={userMenuRef}>
            <div
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => setShowUserMenu((v) => !v)}
            >
              <UserAvatar />
              <span className="text-[13px] font-medium text-[#344054]">
                {displayName}
              </span>
              <ChevronDown
                className={
                  "size-[14px] text-[#667085] transition-transform duration-150 " +
                  (showUserMenu ? "rotate-180" : "")
                }
              />
            </div>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-[200px] bg-white border border-[#E4E7EC] rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E4E7EC]">
                  <p className="text-[13px] font-semibold text-[#101828] truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-[#98A2B3] truncate mt-0.5">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); signOut(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] text-[#D92D20] font-medium hover:bg-[#FEF3F2] transition-colors"
                >
                  <LogOut className="size-[14px] shrink-0" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: date filter bar ── */}
      <div className="flex items-center gap-3 px-6 py-3 bg-[#F8FAFC] border-t border-[#E4E7EC]">
        {/* Label */}
        <span className="text-[11px] font-bold text-[#98A2B3] uppercase tracking-widest shrink-0 select-none">
          Filter Period
        </span>

        <div className="w-px h-5 bg-[#E4E7EC] shrink-0" />

        {/* Preset quick buttons */}
        <div className="flex items-center gap-1 bg-white border border-[#E4E7EC] rounded-lg p-0.5 shadow-sm">
          {QUICK_PRESETS.map((key) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={
                "px-3.5 py-1.5 rounded-md text-[12px] font-semibold transition-all " +
                (preset === key
                  ? "bg-[#00A65D] text-white shadow-sm"
                  : "text-[#667085] hover:text-[#344054] hover:bg-[#F2F4F7]")
              }
            >
              {PRESET_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-[#E4E7EC] shrink-0" />

        {/* Custom range button */}
        <div className="relative">
          <button
            onClick={() => setShowCustom((v) => !v)}
            className={
              "flex items-center gap-2 h-[34px] px-3.5 text-[12px] font-semibold border rounded-lg transition-colors shadow-sm " +
              (preset === "custom"
                ? "bg-[#EEF2FF] border-[#465FFF] text-[#465FFF]"
                : "bg-white border-[#E4E7EC] text-[#667085] hover:border-[#98A2B3] hover:text-[#344054]")
            }
          >
            <Calendar className="size-3.5 shrink-0" />
            Custom Range
          </button>

          {showCustom && (
            <CustomRangePicker
              currentFrom={dateRange.dateFrom}
              currentTo={dateRange.dateTo}
              onApply={setCustomRange}
              onClose={() => setShowCustom(false)}
            />
          )}
        </div>

        <div className="flex-1" />

        {/* Active range badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#6CE9A6] rounded-xl shadow-sm shrink-0">
          <div className="size-2 rounded-full bg-[#00A65D] shrink-0 animate-pulse" />
          <span className="text-[11px] font-bold text-[#027A48] uppercase tracking-wide">
            {PRESET_LABELS[preset]}
          </span>
          <span className="text-[11px] text-[#344054] font-medium">
            {rangeLabel}
          </span>
        </div>
      </div>
    </header>
  );
}
