// /src/app/components/projections/ProjectionInputPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Set Projection Targets — Day-wise projection entry per SBU.
//
// Data model:  business_projections (business_id, projection_date DATE)
//   One row per SBU per calendar day.
//   Monthly total  = SUM of all days in that calendar month.
//   Fiscal Year total = SUM of all days in the fiscal year (Jul–Jun).
//
// cash_target = Cash + Deposit combined (matches "Cash Total" system definition)
//
// Schema required on business_projections table:
//   - projection_date DATE NOT NULL
//   - UNIQUE (business_id, projection_date)
//   (See schema migration note at bottom of this file / in DATABASE.md)
// ─────────────────────────────────────────────────────────────────────────────

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  ChangeEvent,
} from "react";
import {
  ArrowLeft,
  Download,
  Upload,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  X,
  FileText,
  CloudUpload,
  Trash2,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { useNavigation } from "../../../context/NavigationContext";
import type { Business } from "../../../lib/database.types";

// ── Constants ─────────────────────────────────────────────────────────────────

const CALENDAR_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: 9 },
  (_, i) => CURRENT_YEAR - 2 + i,
);

const CSV_TEMPLATE_HEADER =
  "Business,CreditTarget,CashTarget\n";

// ── Date helpers ──────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function firstDayOfWeek(y: number, m: number): number {
  return new Date(y, m - 1, 1).getDay(); // 0=Sun … 6=Sat
}

function monthStart(y: number, m: number): string {
  return `${y}-${pad(m)}-01`;
}
function monthEnd(y: number, m: number): string {
  return `${y}-${pad(m)}-${pad(daysInMonth(y, m))}`;
}

/** ACI fiscal year: Jul–Jun.  Month >= 7 → next calendar year is the FY number. */
function fiscalYearOf(
  calYear: number,
  calMonth: number,
): number {
  return calMonth >= 7 ? calYear + 1 : calYear;
}
function fiscalYearStart(fy: number): string {
  return `${fy - 1}-07-01`;
}
function fiscalYearEnd(fy: number): string {
  return `${fy}-06-30`;
}

function formatDateLabel(
  y: number,
  m: number,
  d: number,
): string {
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Numeric helpers ───────────────────────────────────────────────────────────

function parseNum(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) || n < 0 ? 0 : n;
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtShort(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "B";
  if (n >= 1) return n.toFixed(2) + "M";
  return n.toFixed(4) + "M";
}

// ── Types ────────────────────────────────────────────────────────────────────

interface ProjValues {
  credit: string;
  cash: string;
}
type ValuesMap = Record<string, ProjValues>; // keyed by business_id

interface SaveResult {
  upserted: number;
  skipped: number;
  errors: string[];
  status: "success" | "partial" | "failed";
}

interface SummaryTotals {
  credit: number;
  cash: number;
  total: number;
  sbuCount: number;
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Mini month calendar — click to pick a day; green dots = days with saved data */
function MiniCalendar({
  year,
  month,
  selectedDay,
  daysWithData,
  onDaySelect,
}: {
  year: number;
  month: number;
  selectedDay: number;
  daysWithData: Set<number>;
  onDaySelect: (d: number) => void;
}) {
  const firstDow = firstDayOfWeek(year, month);
  const totalDays = daysInMonth(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {DAY_HEADERS.map((h) => (
          <div
            key={h}
            className="text-center text-[9px] font-semibold text-[#98A2B3] py-1"
          >
            {h}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-[2px]">
        {cells.map((day, i) => (
          <div
            key={i}
            className="flex items-center justify-center"
          >
            {day ? (
              <button
                type="button"
                title={`${CALENDAR_MONTHS[month - 1]} ${day}, ${year}`}
                onClick={() => onDaySelect(day)}
                className={`w-[26px] h-[26px] flex items-center justify-center text-[10px] font-medium rounded-md transition-colors relative ${
                  day === selectedDay
                    ? "bg-[#465FFF] text-white shadow-sm"
                    : daysWithData.has(day)
                      ? "bg-[#DCFAE6] text-[#027A48] hover:bg-[#A9EFC5]"
                      : "text-[#344054] hover:bg-[#F2F4F7]"
                }`}
              >
                {day}
                {/* Green dot indicator */}
                {day !== selectedDay &&
                  daysWithData.has(day) && (
                    <span className="absolute bottom-[2px] left-1/2 -translate-x-1/2 size-[3px] rounded-full bg-[#027A48]" />
                  )}
              </button>
            ) : (
              <div className="w-[26px] h-[26px]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Collapsible panel */
function Collapse({
  icon,
  title,
  subtitle,
  children,
  defaultOpen,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-[#E4E7EC]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#F9FAFB] transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-8 bg-[#F2F4F7] rounded-xl shrink-0">
            {icon}
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#101828]">
              {title}
            </p>
            <p className="text-[10px] text-[#98A2B3] mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>
        <ChevronRight
          className={`size-4 text-[#667085] shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-[#F2F4F7] px-4 pb-4 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

/** CSV drop-zone */
function CsvDropZone({
  file,
  onFile,
  onClear,
}: {
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  return (
    <div>
      {file ? (
        <div className="flex items-center gap-2.5 p-2.5 bg-[#ECFDF3] border border-[#6CE9A6] rounded-xl">
          <div className="flex items-center justify-center size-8 bg-white rounded-lg border border-[#6CE9A6] shrink-0">
            <FileText className="size-4 text-[#00A65D]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[#054F31] truncate">
              {file.name}
            </p>
            <p className="text-[10px] text-[#027A48]">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 size-5 flex items-center justify-center rounded-full hover:bg-[#D1FADF]"
          >
            <X className="size-3 text-[#027A48]" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-1.5 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            dragging
              ? "border-[#00A65D] bg-[#ECFDF3]"
              : "border-[#D0D5DD] hover:border-[#98A2B3] bg-[#F9FAFB]"
          }`}
        >
          <CloudUpload
            className={`size-5 ${dragging ? "text-[#00A65D]" : "text-[#98A2B3]"}`}
          />
          <p className="text-[11px] text-center text-[#344054]">
            <span className="text-[#00A65D] font-medium">
              Click
            </span>{" "}
            or drop CSV
          </p>
          <p className="text-[10px] text-[#98A2B3]">
            Business, CreditTarget, CashTarget
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Small summary metric tile */
function MetricTile({
  label,
  credit,
  cash,
  loading,
  accentColor,
}: {
  label: string;
  credit: number;
  cash: number;
  loading: boolean;
  accentColor: string;
}) {
  const total = credit + cash;
  return (
    <div
      className={`rounded-xl border p-3 flex flex-col gap-1 ${accentColor}`}
    >
      <p className="font-semibold uppercase tracking-wide text-[#667085] text-[11px]">
        {label}
      </p>
      {loading ? (
        <div className="space-y-1">
          <div className="h-4 w-24 bg-[#E4E7EC] rounded animate-pulse" />
          <div className="h-3 w-16 bg-[#E4E7EC] rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className="font-bold text-[#1D2939] leading-tight text-[14px]">
            {fmtShort(total)}
          </p>
          <div className="flex gap-2 mt-0.5">
            <span className="text-[#475467] text-[11px]">
              Credit:{" "}
              <span className="font-semibold text-[#465FFF]">
                {fmtShort(credit)}
              </span>
            </span>
            <span className="text-[#475467] text-[11px]">
              Cash:{" "}
              <span className="font-semibold text-[#027A48]">
                {fmtShort(cash)}
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ── ProjectionInputPage ──────────────────────────────────────────────────────

export function ProjectionInputPage() {
  const { navigate } = useNavigation();

  // ── Period state ───────────────────────────────────────────────────────────
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(TODAY.getMonth() + 1); // 1–12
  const [day, setDay] = useState(TODAY.getDate()); // 1–31 (clamped)

  // Derived
  const projectionDate = toDateStr(year, month, day);
  const fy = fiscalYearOf(year, month);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [bizLoading, setBizLoading] = useState(true);
  const [bizError, setBizError] = useState<string | null>(null);

  const [values, setValues] = useState<ValuesMap>({});
  const [dataLoading, setDataLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ── Calendar highlight (which days have saved data in current month) ────────
  const [daysWithData, setDaysWithData] = useState<Set<number>>(
    new Set(),
  );
  const [calLoading, setCalLoading] = useState(false);

  // ── Projection summaries ──────────────────────────────────────────────────
  const [monthSummary, setMonthSummary] =
    useState<SummaryTotals | null>(null);
  const [yearSummary, setYearSummary] =
    useState<SummaryTotals | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // ── Save state ─────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] =
    useState<SaveResult | null>(null);

  // ── CSV ────────────────────────────────────────────────────────────────────
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  // ── Search ────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");

  // ── Load businesses on mount ──────────────────────────────────────────────
  useEffect(() => {
    setBizLoading(true);
    supabase
      .from("businesses")
      .select("id,name,short_code,category,sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data, error }) => {
        setBizLoading(false);
        if (error) {
          setBizError(error.message);
          return;
        }
        const biz = (data ?? []) as Business[];
        setBusinesses(biz);
        initBlank(biz);
      });
  }, []);

  function initBlank(biz: Business[]) {
    const blank: ValuesMap = {};
    biz.forEach((b) => {
      blank[b.id] = { credit: "", cash: "" };
    });
    setValues(blank);
  }

  // ── Load calendar: which days in current month have data ──────────────────
  const loadCalendarDays = useCallback(
    async (y: number, m: number) => {
      setCalLoading(true);
      const { data } = await supabase
        .from("business_projections")
        .select("projection_date")
        .gte("projection_date", monthStart(y, m))
        .lte("projection_date", monthEnd(y, m));

      const daySet = new Set<number>();
      (data ?? []).forEach((r: { projection_date: string }) => {
        const d = parseInt(r.projection_date.split("-")[2], 10);
        daySet.add(d);
      });
      setDaysWithData(daySet);
      setCalLoading(false);
    },
    [],
  );

  // Refresh calendar whenever year/month changes
  useEffect(() => {
    loadCalendarDays(year, month);
    // Reset summaries so they reload
    setMonthSummary(null);
    setYearSummary(null);
    loadSummaries(year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  // ── Load monthly & fiscal-year summaries ──────────────────────────────────
  async function loadSummaries(y: number, m: number) {
    setSummaryLoading(true);

    const fyVal = fiscalYearOf(y, m);
    const fyStart = fiscalYearStart(fyVal);
    const fyEnd = fiscalYearEnd(fyVal);

    const [monthRes, fyRes] = await Promise.all([
      supabase
        .from("business_projections")
        .select("credit_target,cash_target,business_id")
        .gte("projection_date", monthStart(y, m))
        .lte("projection_date", monthEnd(y, m)),
      supabase
        .from("business_projections")
        .select("credit_target,cash_target,business_id")
        .gte("projection_date", fyStart)
        .lte("projection_date", fyEnd),
    ]);

    function aggregate(
      rows: {
        credit_target: number;
        cash_target: number;
        business_id: string;
      }[],
    ): SummaryTotals {
      const credit = rows.reduce(
        (s, r) => s + (r.credit_target || 0),
        0,
      );
      const cash = rows.reduce(
        (s, r) => s + (r.cash_target || 0),
        0,
      );
      const sbuSet = new Set(rows.map((r) => r.business_id));
      return {
        credit,
        cash,
        total: credit + cash,
        sbuCount: sbuSet.size,
      };
    }

    setMonthSummary(
      aggregate(
        (monthRes.data ?? []) as {
          credit_target: number;
          cash_target: number;
          business_id: string;
        }[],
      ),
    );
    setYearSummary(
      aggregate(
        (fyRes.data ?? []) as {
          credit_target: number;
          cash_target: number;
          business_id: string;
        }[],
      ),
    );
    setSummaryLoading(false);
  }

  // ── Load projections for selected date ────────────────────────────────────
  async function loadProjections() {
    if (businesses.length === 0) return;
    setDataLoading(true);
    setSaveResult(null);

    const { data, error } = await supabase
      .from("business_projections")
      .select("business_id,credit_target,cash_target")
      .eq("projection_date", projectionDate);

    setDataLoading(false);

    if (error) {
      setSaveResult({
        upserted: 0,
        skipped: 0,
        errors: [error.message],
        status: "failed",
      });
      return;
    }

    // Merge DB values (keep blank for missing SBUs)
    setValues((prev) => {
      const next = { ...prev };
      (data ?? []).forEach(
        (row: {
          business_id: string;
          credit_target: number;
          cash_target: number;
        }) => {
          next[row.business_id] = {
            credit:
              row.credit_target > 0
                ? String(row.credit_target)
                : "",
            cash:
              row.cash_target > 0
                ? String(row.cash_target)
                : "",
          };
        },
      );
      return next;
    });
    setDataLoaded(true);
  }

  // ── Period change helpers ─────────────────────────────────────────────────

  function clampDay(y: number, m: number, d: number): number {
    return Math.min(d, daysInMonth(y, m));
  }

  function handleYearChange(y: number) {
    const clampedDay = clampDay(y, month, day);
    setYear(y);
    setDay(clampedDay);
    resetDayState();
  }

  function handleMonthChange(m: number) {
    const clampedDay = clampDay(year, m, day);
    setMonth(m);
    setDay(clampedDay);
    resetDayState();
  }

  function handleDaySelect(d: number) {
    setDay(d);
    resetDayState();
  }

  function resetDayState() {
    initBlank(businesses);
    setDataLoaded(false);
    setSaveResult(null);
  }

  // ── Value change ──────────────────────────────────────────────────────────
  function handleChange(
    bizId: string,
    field: "credit" | "cash",
    raw: string,
  ) {
    const cleaned = raw.replace(/[^0-9.]/g, "");
    setValues((prev) => ({
      ...prev,
      [bizId]: { ...prev[bizId], [field]: cleaned },
    }));
    setSaveResult(null);
  }

  // ── Clear all ─────────────────────────────────────────────────────────────
  function clearAll() {
    initBlank(businesses);
    setDataLoaded(false);
    setSaveResult(null);
  }

  // ── CSV quick-fill ────────────────────────────────────────────────────────
  function parseCsvFile(f: File) {
    setCsvFile(f);
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setCsvError("CSV appears empty");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim());
      const nameIdx = headers.findIndex((h) =>
        /business/i.test(h),
      );
      const credIdx = headers.findIndex((h) =>
        /credit/i.test(h),
      );
      const cashIdx = headers.findIndex((h) => /cash/i.test(h));

      if (nameIdx === -1 || credIdx === -1 || cashIdx === -1) {
        setCsvError(
          "CSV must have columns: Business, CreditTarget, CashTarget",
        );
        return;
      }

      const norm = (s: string) =>
        s.toLowerCase().replace(/\s+/g, " ").trim();
      let matched = 0;

      setValues((prev) => {
        const next = { ...prev };
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim());
          const name = cols[nameIdx] ?? "";
          const biz = businesses.find(
            (b) => norm(b.name) === norm(name),
          );
          if (!biz) continue;
          next[biz.id] = {
            credit: cols[credIdx] ?? "",
            cash: cols[cashIdx] ?? "",
          };
          matched++;
        }
        return next;
      });

      if (matched === 0) setCsvError(null);
      else
        setCsvError("No CSV rows matched any known SBU names");
    };
    reader.readAsText(f);
  }

  // ── Download template ─────────────────────────────────────────────────────
  function downloadTemplate() {
    const rows = businesses
      .map((b) => `${b.name},0,0`)
      .join("\n");
    const blob = new Blob([CSV_TEMPLATE_HEADER + rows], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projection_template_${projectionDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Download current values ───────────────────────────────────────────────
  function downloadCurrentData() {
    const rows = businesses
      .map((b) => {
        const v = values[b.id] ?? { credit: "0", cash: "0" };
        return `${b.name},${parseNum(v.credit)},${parseNum(v.cash)}`;
      })
      .join("\n");
    const blob = new Blob([CSV_TEMPLATE_HEADER + rows], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projections_${projectionDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Save (upsert) to Supabase ─────────────────────────────────────────────
  async function handleSave() {
    if (businesses.length === 0 || saving) return;
    setSaving(true);
    setSaveResult(null);

    const records = businesses
      .filter((b) => {
        const v = values[b.id];
        return (
          v && (parseNum(v.credit) > 0 || parseNum(v.cash) > 0)
        );
      })
      .map((b) => {
        const v = values[b.id]!;
        return {
          business_id: b.id,
          projection_date: projectionDate,
          credit_target: parseNum(v.credit),
          cash_target: parseNum(v.cash),
          updated_at: new Date().toISOString(),
        };
      });

    const skippedCount = businesses.length - records.length;

    if (records.length === 0) {
      setSaveResult({
        upserted: 0,
        skipped: skippedCount,
        errors: [
          "Nothing to save — all Credit and Cash targets are zero or blank.",
        ],
        status: "failed",
      });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("business_projections")
      .upsert(records, {
        onConflict: "business_id,projection_date",
      });

    setSaving(false);

    if (error) {
      setSaveResult({
        upserted: 0,
        skipped: skippedCount,
        errors: [error.message],
        status: "failed",
      });
    } else {
      setSaveResult({
        upserted: records.length,
        skipped: skippedCount,
        errors: [],
        status: "success",
      });
      // Refresh calendar + summaries
      await loadCalendarDays(year, month);
      await loadSummaries(year, month);
    }
  }

  // ── Derived / display ──────────────────────────────────────────────────────
  const filteredBiz = businesses.filter(
    (b) =>
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.short_code ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (b.category ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const grandCredit = businesses.reduce(
    (s, b) => s + parseNum(values[b.id]?.credit ?? ""),
    0,
  );
  const grandCash = businesses.reduce(
    (s, b) => s + parseNum(values[b.id]?.cash ?? ""),
    0,
  );
  const grandTotal = grandCredit + grandCash;

  const filledCount = businesses.filter((b) => {
    const v = values[b.id];
    return (
      v && (parseNum(v.credit) > 0 || parseNum(v.cash) > 0)
    );
  }).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col flex-1 min-w-0 h-full overflow-hidden bg-[#F2F4F7]"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-[#E4E7EC] shrink-0">
        <button
          type="button"
          onClick={() => navigate("dashboard")}
          className="flex items-center justify-center size-[38px] rounded-lg border border-[#E4E7EC] hover:bg-[#F9FAFB] transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="size-4 text-[#667085]" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-[17px] font-semibold text-[#101828] leading-tight">
            Set Projection Targets
          </h1>
          <p className="text-[11px] text-[#98A2B3] mt-0.5">
            Day-wise Credit &amp; Cash projections — monthly
            &amp; yearly totals computed automatically
          </p>
        </div>

        {/* Header badges */}
        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          <span className="px-3 py-1 rounded-full bg-[#ECFDF3] text-[#027A48] text-[12px] font-semibold">
            {MONTH_SHORT[month - 1]} {pad(day)}, {year}
          </span>
          <span className="text-[11px] text-[#98A2B3]">
            {filledCount} / {businesses.length} SBUs
          </span>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-5 p-5 mb-4 overflow-y-auto">
        {/* ── LEFT PANEL ──────────────────────────────────────────────── */}
        <div
          className="flex flex-col gap-4 shrink-0"
          style={{ width: 300 }}
        >
          {/* ── Date Picker ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-[#E4E7EC] p-4">
            {/* Year */}
            <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide mb-2">
              Select Date
            </p>
            <label className="block text-[11px] font-medium text-[#344054] mb-1">
              Fiscal Year
            </label>
            <select
              value={year}
              onChange={(e) =>
                handleYearChange(Number(e.target.value))
              }
              className="w-full h-[34px] px-3 text-[12px] text-[#344054] border border-[#D0D5DD] rounded-lg bg-white outline-none focus:border-[#465FFF] transition-colors mb-3"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y} (FY{fiscalYearOf(y, month)})
                </option>
              ))}
            </select>

            {/* Month grid */}
            <label className="block text-[11px] font-medium text-[#344054] mb-1.5">
              Month
            </label>
            <div className="grid grid-cols-4 gap-1 mb-3">
              {MONTH_SHORT.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleMonthChange(i + 1)}
                  className={`h-7 rounded-lg text-[11px] font-medium transition-colors ${
                    month === i + 1
                      ? "bg-[#465FFF] text-white"
                      : "bg-[#F2F4F7] text-[#667085] hover:bg-[#E4E7EC]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Mini calendar — day picker */}
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-medium text-[#344054]">
                Day — {CALENDAR_MONTHS[month - 1]} {year}
              </label>
              {calLoading && (
                <Loader2 className="size-3 animate-spin text-[#98A2B3]" />
              )}
            </div>
            <MiniCalendar
              year={year}
              month={month}
              selectedDay={day}
              daysWithData={daysWithData}
              onDaySelect={handleDaySelect}
            />
          </div>

          {/* ── Projection Summaries ─────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-[#E4E7EC] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide">
                Aggregated Projections
              </p>
              <button
                type="button"
                onClick={() => loadSummaries(year, month)}
                disabled={summaryLoading}
                className="flex items-center gap-1 text-[10px] text-[#667085] hover:text-[#465FFF] transition-colors"
                title="Refresh summaries"
              >
                <RefreshCw
                  className={`size-3 ${summaryLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            {/* Current day input total (live from table) */}
            <div className="rounded-xl border border-[#E4E7EC] p-3 flex flex-col gap-1 bg-[#F8FAFC] mb-2">
              <p className="font-semibold uppercase tracking-wide text-[#98A2B3] flex items-center gap-1 text-[11px]">
                <Calendar className="size-3" />
                Selected Day Input
              </p>
              <p className="text-[14px] font-bold text-[#1D2939]">
                {fmtShort(grandTotal)}
              </p>
              <div className="flex gap-2">
                <span className="text-[#475467] text-[11px]">
                  Credit:{" "}
                  <span className="font-semibold text-[#465FFF]">
                    {fmtShort(grandCredit)}
                  </span>
                </span>
                <span className="text-[11px] text-[#475467]">
                  Cash:{" "}
                  <span className="font-semibold text-[#027A48]">
                    {fmtShort(grandCash)}
                  </span>
                </span>
              </div>
              <p className="text-[#98A2B3] mt-0.5 text-[10px]">
                {formatDateLabel(year, month, day)}
              </p>
            </div>

            {/* Monthly total from DB */}
            <MetricTile
              label={`${MONTH_SHORT[month - 1]} ${year} — Month Total`}
              credit={monthSummary?.credit ?? 0}
              cash={monthSummary?.cash ?? 0}
              loading={summaryLoading}
              accentColor="border-[#EEF4FF] bg-[#F8FAFF]"
            />

            <div className="mt-2">
              <MetricTile
                label={`FY${fy} — Full Year Total`}
                credit={yearSummary?.credit ?? 0}
                cash={yearSummary?.cash ?? 0}
                loading={summaryLoading}
                accentColor="border-[#ECFDF3] bg-[#F6FEF9]"
              />
            </div>
          </div>

          {/* ── Actions ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-[#E4E7EC] p-4 flex flex-col gap-2">
            <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide mb-1">
              Actions
            </p>

            {/* Load existing */}
            <button
              type="button"
              onClick={loadProjections}
              disabled={dataLoading || bizLoading}
              className="flex items-center gap-2 h-[36px] px-4 rounded-lg text-[12px] font-semibold border border-[#D0D5DD] text-[#344054] hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors w-full"
            >
              {dataLoading ? (
                <Loader2 className="size-[14px] animate-spin text-[#667085]" />
              ) : (
                <RefreshCw className="size-[14px] text-[#667085]" />
              )}
              {dataLoaded
                ? "Reload from DB"
                : "Load Existing Data"}
            </button>

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              disabled={
                saving || bizLoading || filledCount === 0
              }
              className="flex items-center gap-2 h-[36px] px-4 rounded-lg text-[12px] font-semibold bg-[#465FFF] text-white hover:bg-[#3451E6] disabled:opacity-50 transition-colors w-full"
            >
              {saving ? (
                <Loader2 className="size-[14px] animate-spin" />
              ) : (
                <Save className="size-[14px]" />
              )}
              {saving
                ? "Saving…"
                : `Save All (${filledCount} rows)`}
            </button>

            {/* Clear */}
            <button
              type="button"
              onClick={clearAll}
              disabled={saving}
              className="flex items-center gap-2 h-[36px] px-4 rounded-lg text-[12px] font-semibold border border-[#FECDCA] text-[#D92D20] bg-[#FEF3F2] hover:bg-[#FEE4E2] disabled:opacity-50 transition-colors w-full"
            >
              <Trash2 className="size-[14px]" />
              Clear All Values
            </button>
          </div>

          {/* Save result banner */}
          {saveResult && (
            <div
              className={`rounded-2xl border p-3.5 flex flex-col gap-1.5 ${
                saveResult.status === "success"
                  ? "bg-[#ECFDF3] border-[#6CE9A6]"
                  : "bg-[#FEF3F2] border-[#FECDCA]"
              }`}
            >
              <div className="flex items-start gap-2">
                {saveResult.status === "success" ? (
                  <CheckCircle2 className="size-4 text-[#027A48] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="size-4 text-[#D92D20] shrink-0 mt-0.5" />
                )}
                <div>
                  {saveResult.status === "success" ? (
                    <p className="text-[12px] font-semibold text-[#027A48]">
                      Saved {saveResult.upserted} rows ·{" "}
                      {saveResult.skipped} blank skipped
                    </p>
                  ) : (
                    saveResult.errors.map((e, i) => (
                      <p
                        key={i}
                        className="text-[11px] text-[#D92D20]"
                      >
                        {e}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CSV Quick-fill */}
          <Collapse
            icon={<Upload className="size-4 text-[#667085]" />}
            title="CSV Quick Fill"
            subtitle="Paste values from a spreadsheet"
          >
            <div className="flex flex-col gap-3">
              <p className="text-[11px] text-[#667085]">
                Upload a CSV with columns{" "}
                <strong>Business</strong>,{" "}
                <strong>CreditTarget</strong>,{" "}
                <strong>CashTarget</strong> (figures in BDT
                Millions). Values fill the selected day{" "}
                <strong>
                  {formatDateLabel(year, month, day)}
                </strong>
                .
              </p>
              <CsvDropZone
                file={csvFile}
                onFile={parseCsvFile}
                onClear={() => {
                  setCsvFile(null);
                  setCsvError(null);
                }}
              />
              {csvError && (
                <p className="text-[11px] text-[#D92D20] flex items-center gap-1">
                  <AlertCircle className="size-3 shrink-0" />{" "}
                  {csvError}
                </p>
              )}
              <button
                type="button"
                onClick={downloadTemplate}
                disabled={bizLoading}
                className="flex items-center gap-2 h-[32px] px-3 rounded-lg text-[11px] font-medium border border-[#D0D5DD] text-[#344054] hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors w-full"
              >
                <Download className="size-3.5 text-[#667085]" />
                Download blank template
              </button>
              <button
                type="button"
                onClick={downloadCurrentData}
                disabled={bizLoading || filledCount === 0}
                className="flex items-center gap-2 h-[32px] px-3 rounded-lg text-[11px] font-medium border border-[#D0D5DD] text-[#344054] hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors w-full"
              >
                <Download className="size-3.5 text-[#667085]" />
                Export current values
              </button>
            </div>
          </Collapse>
        </div>

        {/* ── RIGHT PANEL — editable table ─────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 bg-white rounded-2xl border border-[#E4E7EC]">
          {/* Table toolbar */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#E4E7EC] shrink-0">
            <div className="flex flex-col flex-1">
              <h2 className="text-[14px] font-semibold text-[#1D2939]">
                Daily Projection Entry:{" "}
                {formatDateLabel(year, month, day)}
              </h2>
            </div>

            {/* Month & year summary quick-view */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0F3FF] border border-[#C7D2FE]">
                <span className="text-[10px] font-semibold text-[#465FFF]">
                  {MONTH_SHORT[month - 1]}:{" "}
                  {summaryLoading
                    ? "…"
                    : fmtShort(monthSummary?.total ?? 0)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ECFDF3] border border-[#A9EFC5]">
                <span className="text-[10px] font-semibold text-[#027A48]">
                  FY{fy}:{" "}
                  {summaryLoading
                    ? "…"
                    : fmtShort(yearSummary?.total ?? 0)}
                </span>
              </div>
            </div>

            <input
              type="text"
              placeholder="Search SBU…"
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              className="h-[32px] px-3 text-[12px] border border-[#D0D5DD] rounded-lg outline-none focus:border-[#465FFF] bg-white text-[#344054] transition-colors shrink-0"
              style={{ width: 150 }}
            />
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full min-w-[620px]">
              <thead className="sticky top-0 z-10 bg-[#F8FAFC] border-b border-[#E4E7EC]">
                <tr>
                  <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-[#667085] w-6">
                    #
                  </th>
                  <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-[#667085]">
                    SBU Name
                  </th>
                  <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-[#667085] w-24">
                    Category
                  </th>
                  <th className="py-2.5 px-4 text-right text-[11px] font-semibold text-[#465FFF] w-40">
                    Credit Target (M)
                  </th>
                  <th className="py-2.5 px-4 text-right text-[11px] font-semibold text-[#00A65D] w-40">
                    Cash Target (M)
                  </th>
                  <th className="py-2.5 px-4 text-right text-[11px] font-semibold text-[#667085] w-36">
                    Day Total (M)
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F2F4F7]">
                {bizLoading ? (
                  Array.from({ length: 14 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-2.5 px-4">
                        <div className="h-3 w-4 bg-[#E4E7EC] rounded" />
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="h-4 w-48 bg-[#E4E7EC] rounded" />
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="h-4 w-16 bg-[#E4E7EC] rounded" />
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="h-8 w-32 bg-[#E4E7EC] rounded-lg ml-auto" />
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="h-8 w-32 bg-[#E4E7EC] rounded-lg ml-auto" />
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="h-4 w-24 bg-[#E4E7EC] rounded ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : bizError ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-[13px] text-[#D92D20]"
                    >
                      <AlertCircle className="size-5 mx-auto mb-2" />
                      {bizError}
                    </td>
                  </tr>
                ) : filteredBiz.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-[13px] text-[#98A2B3]"
                    >
                      No SBUs match your search.
                    </td>
                  </tr>
                ) : (
                  filteredBiz.map((biz, idx) => {
                    const v = values[biz.id] ?? {
                      credit: "",
                      cash: "",
                    };
                    const cred = parseNum(v.credit);
                    const cash = parseNum(v.cash);
                    const total = cred + cash;
                    const isFilled = cred > 0 || cash > 0;

                    return (
                      <tr
                        key={biz.id}
                        className={`group transition-colors hover:bg-[#F9FAFB] ${!isFilled ? "opacity-80" : ""}`}
                      >
                        {/* # */}
                        <td className="py-2 px-4 text-[11px] text-[#98A2B3]">
                          {idx + 1}
                        </td>

                        {/* SBU Name */}
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-1.5">
                            {isFilled && (
                              <div className="size-1.5 rounded-full bg-[#00A65D] shrink-0" />
                            )}
                            <span className="text-[12px] font-medium text-[#344054] truncate max-w-[240px]">
                              {biz.name}
                            </span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-2 px-4">
                          {biz.category ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-[#F2F4F7] text-[#475467] text-[10px] font-medium whitespace-nowrap">
                              {biz.category}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#C0C7D1]">
                              —
                            </span>
                          )}
                        </td>

                        {/* Credit Target */}
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={v.credit}
                            onChange={(e) =>
                              handleChange(
                                biz.id,
                                "credit",
                                e.target.value,
                              )
                            }
                            placeholder="0.00"
                            className={`w-full h-[32px] px-3 text-[12px] text-right border rounded-lg outline-none transition-colors bg-white ${
                              v.credit
                                ? "border-[#B3CBFF] focus:border-[#465FFF] text-[#344054]"
                                : "border-[#E4E7EC] focus:border-[#465FFF] text-[#98A2B3]"
                            }`}
                          />
                        </td>

                        {/* Cash Target */}
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={v.cash}
                            onChange={(e) =>
                              handleChange(
                                biz.id,
                                "cash",
                                e.target.value,
                              )
                            }
                            placeholder="0.00"
                            className={`w-full h-[32px] px-3 text-[12px] text-right border rounded-lg outline-none transition-colors bg-white ${
                              v.cash
                                ? "border-[#A9EFC5] focus:border-[#00A65D] text-[#344054]"
                                : "border-[#E4E7EC] focus:border-[#00A65D] text-[#98A2B3]"
                            }`}
                          />
                        </td>

                        {/* Day Total (computed, read-only) */}
                        <td className="py-2 px-4 text-right">
                          {total > 0 ? (
                            <span className="text-[12px] font-semibold text-[#1D2939]">
                              {fmtNum(total)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#C0C7D1]">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Sticky grand-total footer */}
              {!bizLoading && businesses.length > 0 && (
                <tfoot className="sticky bottom-0 bg-[#F8FAFC] border-t-2 border-[#E4E7EC]">
                  <tr>
                    <td
                      colSpan={3}
                      className="py-3 px-4 text-[12px] font-semibold text-[#344054]"
                    >
                      Day Grand Total ({filledCount} SBUs with
                      targets)
                    </td>
                    <td className="py-3 px-4 text-right text-[13px] font-bold text-[#465FFF] whitespace-nowrap">
                      {fmtNum(grandCredit)}
                    </td>
                    <td className="py-3 px-4 text-right text-[13px] font-bold text-[#027A48] whitespace-nowrap">
                      {fmtNum(grandCash)}
                    </td>
                    <td className="py-3 px-4 text-right text-[13px] font-bold text-[#1D2939] whitespace-nowrap">
                      {fmtNum(grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Bottom action bar */}
          {!bizLoading && businesses.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#E4E7EC] bg-white shrink-0">
              <p className="text-[11px] text-[#98A2B3]">
                {dataLoaded
                  ? `Loaded from DB · ${formatDateLabel(year, month, day)}`
                  : 'Enter targets manually or click "Load Existing Data" to pull saved values'}
              </p>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || filledCount === 0}
                className="flex items-center gap-2 h-[36px] px-5 rounded-lg text-[12px] font-semibold bg-[#465FFF] text-white hover:bg-[#3451E6] disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 className="size-[14px] animate-spin" />
                ) : (
                  <Save className="size-[14px]" />
                )}
                {saving
                  ? "Saving…"
                  : `Save ${filledCount} Rows`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/*
─────────────────────────────────────────────────────────────────────────────
  REQUIRED SCHEMA MIGRATION for business_projections table
  Run the following in your Supabase SQL Editor:
─────────────────────────────────────────────────────────────────────────────

-- Step 1: Add the new projection_date column
ALTER TABLE business_projections
  ADD COLUMN IF NOT EXISTS projection_date DATE;

-- Step 2: If you have existing data, backfill projection_date from old columns:
-- UPDATE business_projections
--   SET projection_date = make_date(
--     fiscal_year,
--     GREATEST(fiscal_month, 1),   -- treat month=0 (annual) as January
--     COALESCE(NULLIF(fiscal_day, 0), 1)  -- day=0 → day 1
--   )
-- WHERE projection_date IS NULL AND fiscal_month BETWEEN 1 AND 12;
-- If no existing data, skip the UPDATE.

-- Step 3: Make it NOT NULL
ALTER TABLE business_projections
  ALTER COLUMN projection_date SET NOT NULL;

-- Step 4: Drop the old unique constraint (name may differ — check \d business_projections)
ALTER TABLE business_projections
  DROP CONSTRAINT IF EXISTS business_projections_business_id_fiscal_year_fiscal_month_key;

-- Step 5: Add new unique constraint
ALTER TABLE business_projections
  ADD CONSTRAINT business_projections_business_id_projection_date_key
  UNIQUE (business_id, projection_date);

-- Step 6: Drop old columns (safe after migration)
ALTER TABLE business_projections
  DROP COLUMN IF EXISTS fiscal_year,
  DROP COLUMN IF EXISTS fiscal_month,
  DROP COLUMN IF EXISTS fiscal_day;

-- Step 7: Update indexes
DROP INDEX IF EXISTS idx_biz_proj_year_month;
CREATE INDEX IF NOT EXISTS idx_biz_proj_date     ON business_projections (projection_date DESC);
CREATE INDEX IF NOT EXISTS idx_biz_proj_biz_date ON business_projections (business_id, projection_date DESC);

─────────────────────────────────────────────────────────────────────────────
*/