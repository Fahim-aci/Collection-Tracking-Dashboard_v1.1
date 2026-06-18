// /src/app/components/import/ImportDataPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Data Import page — v2 schema (collection_date, no collection_periods).
//
// Workflow:
//   1. Upload CSV  →  preview matched rows
//   2. Pick collection date & time  →  stored as collection_date DATE
//   3. SPLY toggle  →  if on, also upsert SPLY rows to (date − 1 year)
//   4. Import  →  upsert to collection_records(business_id, collection_date)
//
// The "period" concept is gone. The date itself is the period key.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload, Calendar, CheckCircle2, AlertCircle, XCircle,
  FileText, ArrowLeft, CloudUpload, Loader2, X,
  ChevronLeft, ChevronRight, Clock, Lock, Database,
} from 'lucide-react';
import { supabase }       from '../../../lib/supabaseClient';
import { useNavigation }  from '../../../context/NavigationContext';
import { useDateFilter }  from '../../../context/DateFilterContext';
import type { Business }  from '../../../lib/database.types';

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt2(n: number) { return String(n).padStart(2, '0'); }
function nowTime() {
  const d = new Date();
  return `${fmt2(d.getHours())}:${fmt2(d.getMinutes())}:${fmt2(d.getSeconds())}`;
}
function fmtDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function isoDate(d: Date) {
  return `${d.getFullYear()}-${fmt2(d.getMonth() + 1)}-${fmt2(d.getDate())}`;
}
function minusOneYear(dateStr: string): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() - 1);
  return isoDate(d);
}

const MONTHS     = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ── Types ──────────────────────────────────────────────────────────────────

interface ParsedRow {
  business:    string;
  credit:      number;
  cash:        number;
  deposit:     number;
  creditSPLY:  number;
  cashSPLY:    number;
  depositSPLY: number;
}

interface MatchedRow extends ParsedRow {
  businessId:  string | null;
  matchStatus: 'matched' | 'unmatched';
}

interface ImportResult {
  currentInserted: number;
  splyInserted:    number;
  skipped:         number;
  errors:          string[];
  status:          'success' | 'partial' | 'failed';
}

// ── CSV Parser ─────────────────────────────────────────────────────────────

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());

  const getNum = (values: string[], colName: string): number => {
    const idx = headers.indexOf(colName);
    if (idx === -1 || idx >= values.length) return 0;
    return parseFloat(values[idx]) || 0;
  };

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (!values[0] || values[0] === '') continue;
    rows.push({
      business:    values[0],
      credit:      getNum(values, 'Credit'),
      cash:        getNum(values, 'Cash'),
      deposit:     getNum(values, 'Deposit'),
      creditSPLY:  getNum(values, 'CreditSPLY'),
      cashSPLY:    getNum(values, 'CashSPLY'),
      depositSPLY: getNum(values, 'DepositSPLY'),
    });
  }
  return rows;
}

// ── Mini Calendar ──────────────────────────────────────────────────────────

function MiniCalendar({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const [viewYear,  setViewYear]  = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayDate   = new Date();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isSelected = (day: number) =>
    selected.getFullYear() === viewYear &&
    selected.getMonth()    === viewMonth &&
    selected.getDate()     === day;

  const isToday = (day: number) =>
    todayDate.getFullYear() === viewYear &&
    todayDate.getMonth()    === viewMonth &&
    todayDate.getDate()     === day;

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth}
          className="flex items-center justify-center size-7 rounded-lg border border-[#E4E7EC] hover:bg-[#F9FAFB] transition-colors">
          <ChevronLeft className="size-3.5 text-[#667085]" />
        </button>
        <span className="text-[13px] font-semibold text-[#344054]">{MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth}
          className="flex items-center justify-center size-7 rounded-lg border border-[#E4E7EC] hover:bg-[#F9FAFB] transition-colors">
          <ChevronRight className="size-3.5 text-[#667085]" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-[#98A2B3] py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => (
          <div key={idx} className="flex items-center justify-center">
            {day === null ? (
              <div className="size-7" />
            ) : (
              <button
                type="button"
                onClick={() => onSelect(new Date(viewYear, viewMonth, day))}
                className={`size-7 flex items-center justify-center rounded-lg text-[12px] transition-colors
                  ${isSelected(day)
                    ? 'bg-[#00A65D] text-white font-semibold'
                    : isToday(day)
                    ? 'text-[#00A65D] font-semibold hover:bg-[#ECFDF3]'
                    : 'text-[#344054] hover:bg-[#F2F4F7]'
                  }`}
              >
                {day}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DateTimePicker ─────────────────────────────────────────────────────────

function DateTimePicker({
  value, time, onDateChange, onTimeChange,
}: {
  value: Date; time: string;
  onDateChange: (d: Date) => void;
  onTimeChange: (t: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative z-20">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 h-[38px] px-3 text-[13px] text-[#344054] border border-[#D0D5DD] rounded-lg bg-white hover:border-[#00A65D] transition-colors"
      >
        <Calendar className="size-[14px] text-[#667085] shrink-0" />
        <span className="flex-1 text-left">{fmtDate(value)}  ·  {time}</span>
        <ChevronRight className={`size-[13px] text-[#667085] shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-[#E4E7EC] rounded-2xl shadow-xl p-4 w-[300px]">
          <MiniCalendar selected={value} onSelect={d => onDateChange(d)} />

          <div className="border-t border-[#F2F4F7] mt-3 pt-3">
            <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Clock className="size-3 text-[#98A2B3]" />
              Exact Time (HH : MM : SS)
            </p>
            <input
              type="time"
              step="1"
              value={time}
              onChange={e => onTimeChange(e.target.value || '00:00:00')}
              className="w-full h-[38px] px-3 text-[13px] text-[#344054] border border-[#D0D5DD] rounded-lg outline-none focus:border-[#00A65D] transition-colors bg-white"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            />
            <p className="text-[10px] text-[#98A2B3] mt-1.5">
              24-hour format. Stored in audit log only.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full h-[34px] bg-[#00A65D] text-white text-[12px] font-semibold rounded-lg hover:bg-[#009954] transition-colors"
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}

// ── FileDropZone ───────────────────────────────────────────────────────────

function FileDropZone({ file, onFile, onClear }: {
  file: File | null; onFile: (f: File) => void; onClear: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div>
      {file ? (
        <div className="flex items-center gap-3 p-3 bg-[#ECFDF3] border border-[#6CE9A6] rounded-xl">
          <div className="flex items-center justify-center size-9 bg-white rounded-lg border border-[#6CE9A6] shrink-0">
            <FileText className="size-4 text-[#00A65D]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#054F31] truncate">{file.name}</p>
            <p className="text-[11px] text-[#027A48]">{(file.size / 1024).toFixed(1)} KB · CSV</p>
          </div>
          <button type="button" onClick={onClear}
            className="shrink-0 size-6 flex items-center justify-center rounded-full hover:bg-[#D1FADF] transition-colors">
            <X className="size-3.5 text-[#027A48]" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            dragging
              ? 'border-[#00A65D] bg-[#ECFDF3] scale-[1.01]'
              : 'border-[#D0D5DD] hover:border-[#98A2B3] bg-[#F9FAFB] hover:bg-[#F2F4F7]'
          }`}
        >
          <div className="flex items-center justify-center size-10 bg-white rounded-xl border border-[#E4E7EC] shadow-sm">
            <CloudUpload className={`size-5 transition-colors ${dragging ? 'text-[#00A65D]' : 'text-[#667085]'}`} />
          </div>
          <div className="text-center">
            <p className="text-[13px] font-medium text-[#344054]">
              <span className="text-[#00A65D]">Click to upload</span> or drag & drop
            </p>
            <p className="text-[11px] text-[#98A2B3] mt-0.5">CSV file / system export</p>
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </div>
  );
}



function HowItWorksPanel() {
  const [open, setOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  return (
    null
  );
}

// ── ImportDataPage ─────────────────────────────────────────────────────────

export function ImportDataPage() {
  const { navigate }       = useNavigation();
  const { setCustomRange } = useDateFilter();

  // Business master for name matching
  const [businesses,        setBusinesses]        = useState<Business[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(true);
  const [businessesError,   setBusinessesError]   = useState<string | null>(null);

  // Check date_locks for the selected date
  const [isDateLocked, setIsDateLocked] = useState(false);

  useEffect(() => {
    setBusinessesLoading(true);
    setBusinessesError(null);
    supabase
      .from('businesses')
      .select('id,name')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        setBusinessesLoading(false);
        if (error) { setBusinessesError(error.message); return; }
        if (!data || data.length === 0) {
          setBusinessesError(
            'No businesses found. Run the seed SQL from DATABASE.md Section 9A first.',
          );
          return;
        }
        setBusinesses(data as Business[]);
      });
  }, []);

  // File / CSV state
  const [file,        setFile]        = useState<File | null>(null);
  const [parsedRows,  setParsedRows]  = useState<ParsedRow[]>([]);
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);

  // Config state
  const [collectionDate, setCollectionDate] = useState<Date>(new Date());
  const [collectionTime, setCollectionTime] = useState<string>(nowTime());
  const [importSply,     setImportSply]     = useState<boolean>(true);

  // Import state
  const [isImporting,  setIsImporting]  = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // ── Check lock status when date changes ──────────────────────────────────
  useEffect(() => {
    const dateStr = isoDate(collectionDate);
    supabase
      .from('date_locks')
      .select('collection_date')
      .eq('collection_date', dateStr)
      .maybeSingle()
      .then(({ data }) => setIsDateLocked(!!data));
  }, [collectionDate]);

  // ── Name matching ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (parsedRows.length === 0) { setMatchedRows([]); return; }
    const norm = (s: string) =>
      s.replace(/[\u00A0\u200B\uFEFF\t]/g, ' ')
       .replace(/\s+/g, ' ')
       .toLowerCase()
       .trim();

    const mapped: MatchedRow[] = parsedRows.map(r => {
      const rowNorm = norm(r.business);
      const match   = businesses.find(b => norm(b.name) === rowNorm);
      return { ...r, businessId: match?.id ?? null, matchStatus: match ? 'matched' : 'unmatched' };
    });
    setMatchedRows(mapped);
  }, [parsedRows, businesses]);

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFile = useCallback((f: File) => {
    setFile(f);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setParsedRows(parseCSV(text));
    };
    reader.readAsText(f);
  }, []);

  const handleClear = useCallback(() => {
    setFile(null);
    setParsedRows([]);
    setMatchedRows([]);
    setImportResult(null);
  }, []);

  // ── Import action ─────────────────────────────────────────────────────────
  async function handleImport() {
    if (!file || matchedRows.length === 0 || isDateLocked) return;
    setIsImporting(true);
    setImportResult(null);

    const matched    = matchedRows.filter(r => r.businessId !== null);
    const skipped    = matchedRows.filter(r => r.businessId === null);
    const errors: string[] = [];
    let currentInserted = 0;
    let splyInserted    = 0;

    const dateStr      = isoDate(collectionDate);
    const splyDateStr  = minusOneYear(dateStr);
    const notes        = `Collected: ${dateStr}T${collectionTime} | Source: ${file.name}`;

    try {
      // ── Step 1: Upsert SPLY records (collection_date − 1 year) ──────────
      if (importSply) {
        const hasSplyData = matched.some(r => r.creditSPLY !== 0 || r.cashSPLY !== 0 || r.depositSPLY !== 0);

        if (hasSplyData) {
          const splyRecords = matched.map(r => ({
            business_id:    r.businessId!,
            collection_date: splyDateStr,
            credit_amount:  r.creditSPLY,
            cash_amount:    r.cashSPLY,
            deposit_amount: r.depositSPLY,
            data_source:    'csv_import' as const,
            notes: `SPLY row — imported from "${file.name}" on ${dateStr}`,
          }));

          const { error: splyErr } = await supabase
            .from('collection_records')
            .upsert(splyRecords, { onConflict: 'business_id,collection_date' });

          if (splyErr) errors.push(`SPLY upsert failed: ${splyErr.message}`);
          else splyInserted = splyRecords.length;
        }
      }

      // ── Step 2: Upsert current-date records ───────────────────────────────
      const currentRecords = matched.map(r => ({
        business_id:    r.businessId!,
        collection_date: dateStr,
        credit_amount:  r.credit,
        cash_amount:    r.cash,
        deposit_amount: r.deposit,
        data_source:    'csv_import' as const,
        notes,
      }));

      const { error: curErr } = await supabase
        .from('collection_records')
        .upsert(currentRecords, { onConflict: 'business_id,collection_date' });

      if (curErr) errors.push(`Current upsert failed: ${curErr.message}`);
      else currentInserted = currentRecords.length;

      // ── Step 3: Log to import_logs ────────────────────────────────────────
      const status = errors.length === 0 ? 'success' : (currentInserted > 0 ? 'partial' : 'failed');
      await supabase.from('import_logs').insert({
        collection_date:     dateStr,
        file_name:           file.name,
        row_count:           matched.length,
        status,
        error_details:       { errors, collection_time: collectionTime },
        skipped_businesses:  skipped.map(r => r.business),
      });

      // ── Step 4: Switch dashboard to just-imported date ───────────────────
      if (status !== 'failed') {
        setCustomRange(dateStr, dateStr);
      }

      setImportResult({ currentInserted, splyInserted, skipped: skipped.length, errors, status });

    } catch (e: unknown) {
      setImportResult({
        currentInserted: 0, splyInserted: 0,
        skipped: matchedRows.length,
        errors:  [e instanceof Error ? e.message : 'Unknown error during import'],
        status:  'failed',
      });
    } finally {
      setIsImporting(false);
    }
  }

  // ── Derived counts ────────────────────────────────────────────────────────
  const matchedCount   = matchedRows.filter(r => r.matchStatus === 'matched').length;
  const unmatchedCount = matchedRows.filter(r => r.matchStatus === 'unmatched').length;
  const canImport      = !!file && matchedCount > 0 && !isImporting && !isDateLocked;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col flex-1 min-w-0 h-full overflow-hidden bg-[#F2F4F7]"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* ── Page Header ── */}
      <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-[#E4E7EC] shrink-0">
        <button
          type="button"
          onClick={() => navigate('dashboard')}
          className="flex items-center justify-center size-[38px] rounded-lg border border-[#E4E7EC] hover:bg-[#F9FAFB] transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="size-4 text-[#667085]" />
        </button>
        <div className="flex-1">
          <h1 className="text-[16px] font-semibold text-[#101828]">Import Collection Data</h1>
          <p className="text-[12px] text-[#667085]">
            Upload CSV to Update Daily Collections.
          </p>
        </div>
        {importResult?.status === 'success' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ECFDF3] border border-[#6CE9A6] rounded-full">
            <CheckCircle2 className="size-3.5 text-[#027A48]" />
            <span className="text-[12px] font-medium text-[#027A48]">Last import successful</span>
          </div>
        )}
      </div>

      {/* ── DB health banner ── */}
      {(businessesLoading || businessesError) && (
        <div className={`shrink-0 flex items-start gap-3 px-6 py-3 border-b ${
          businessesLoading ? 'bg-[#F8FAFC] border-[#E4E7EC]' : 'bg-[#FEF3F2] border-[#FDA29B]'
        }`}>
          {businessesLoading
            ? <Loader2 className="size-4 text-[#667085] animate-spin shrink-0 mt-0.5" />
            : <XCircle  className="size-4 text-[#B42318] shrink-0 mt-0.5" />
          }
          <div>
            <p className={`text-[12px] font-semibold ${businessesLoading ? 'text-[#344054]' : 'text-[#B42318]'}`}>
              {businessesLoading ? 'Loading business list from database…' : 'Database not reachable — all rows will show as Not Found'}
            </p>
            {businessesError && (
              <p className="text-[11px] text-[#667085] mt-0.5 leading-relaxed">{businessesError}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto p-5">
        <HowItWorksPanel />

        <div className="flex gap-5 items-start">

          {/* ── Left config panel ── */}
          <div className="flex flex-col gap-4 shrink-0" style={{ width: 340 }}>

            {/* 1. Upload CSV */}
            <div className="bg-white rounded-2xl border border-[#E4E7EC] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center size-5 bg-[#ECFDF3] rounded-full text-[#00A65D] text-[10px] font-bold shrink-0">1</span>
                <h2 className="text-[13px] font-semibold text-[#344054]">Upload CSV File</h2>
              </div>
              <FileDropZone file={file} onFile={handleFile} onClear={handleClear} />
              {file && parsedRows.length > 0 && (
                <p className="mt-2 text-[11px] text-[#667085]">
                  Parsed <span className="font-semibold text-[#344054]">{parsedRows.length}</span> rows ·{' '}
                  <span className="text-[#027A48] font-medium">{matchedCount} matched</span>
                  {unmatchedCount > 0 && (
                    <> · <span className="text-[#B42318] font-medium">{unmatchedCount} unmatched</span></>
                  )}
                </p>
              )}
            </div>

            {/* 2. Collection date */}
            <div className="bg-white rounded-2xl border border-[#E4E7EC] p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center size-5 bg-[#ECFDF3] rounded-full text-[#00A65D] text-[10px] font-bold shrink-0">2</span>
                <h2 className="text-[13px] font-semibold text-[#344054]">Collection Date & Time</h2>
              </div>
              <DateTimePicker
                value={collectionDate}
                time={collectionTime}
                onDateChange={d => { setCollectionDate(d); setImportResult(null); }}
                onTimeChange={setCollectionTime}
              />

              {/* Lock status indicator */}
              {isDateLocked ? (
                <div className="mt-2 flex items-center gap-1.5 px-2 py-2 bg-[#FEF3F2] border border-[#FDA29B] rounded-lg">
                  <Lock className="size-3 text-[#B42318] shrink-0" />
                  <p className="text-[10px] font-medium text-[#B42318]">
                    This date is locked. Unlock it first via admin tools.
                  </p>
                </div>
              ) : (
                <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 bg-[#F8FAFC] rounded-lg">
                  <Database className="size-3 text-[#98A2B3] shrink-0 mt-0.5" />
                  <p className="text-[10px] text-[#98A2B3] leading-relaxed">
                    This date will be the <strong>collection_date</strong> key for all rows.
                    SPLY records go to <strong>{minusOneYear(isoDate(collectionDate))}</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* 3. SPLY toggle */}
            <div className="bg-white rounded-2xl border border-[#E4E7EC] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center size-5 bg-[#ECFDF3] rounded-full text-[#00A65D] text-[10px] font-bold shrink-0">3</span>
                <h2 className="text-[13px] font-semibold text-[#344054]">SPLY Import</h2>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[12px] font-medium text-[#344054] block">
                    Also import SPLY data
                  </label>
                  <p className="text-[10px] text-[#98A2B3] mt-0.5">
                    Reads CreditSPLY / CashSPLY / DepositSPLY columns
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setImportSply(v => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${importSply ? 'bg-[#00A65D]' : 'bg-[#D0D5DD]'}`}
                  aria-checked={importSply}
                  role="switch"
                >
                  <span className={`inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform ${importSply ? 'translate-x-4' : 'translate-x-1'}`} />
                </button>
              </div>

              {importSply && (
                <div className="mt-3 flex items-start gap-1.5 px-2 py-2 bg-[#EEF2FF] border border-[#C7D7FD] rounded-lg">
                  <AlertCircle className="size-3 text-[#465FFF] shrink-0 mt-0.5" />
                  <p className="text-[10px] text-[#3538CD] leading-relaxed">
                    SPLY rows will be upserted to <strong>{minusOneYear(isoDate(collectionDate))}</strong>.
                    If that date is locked, the SPLY upsert will fail.
                  </p>
                </div>
              )}
            </div>

            {/* Import button */}
            <button
              type="button"
              onClick={handleImport}
              disabled={!canImport}
              className="flex items-center justify-center gap-2 h-[44px] bg-[#00A65D] text-white text-[13px] font-semibold rounded-xl hover:bg-[#009954] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {isImporting ? (
                <><Loader2 className="size-4 animate-spin" /> Importing…</>
              ) : isDateLocked ? (
                <><Lock className="size-4" /> Date Locked</>
              ) : (
                <><Upload className="size-4" /> Import {matchedCount > 0 ? `${matchedCount} Records` : 'Data'}</>
              )}
            </button>

            {/* Result card */}
            {importResult && (
              <div className={`rounded-xl border p-4 ${
                importResult.status === 'success' ? 'bg-[#ECFDF3] border-[#6CE9A6]' :
                importResult.status === 'partial' ? 'bg-[#FFFAEB] border-[#FEC84B]' :
                'bg-[#FEF3F2] border-[#FDA29B]'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {importResult.status === 'success' ? (
                    <CheckCircle2 className="size-4 text-[#027A48] shrink-0" />
                  ) : importResult.status === 'partial' ? (
                    <AlertCircle  className="size-4 text-[#B54708] shrink-0" />
                  ) : (
                    <XCircle      className="size-4 text-[#B42318] shrink-0" />
                  )}
                  <span className={`text-[13px] font-semibold ${
                    importResult.status === 'success' ? 'text-[#027A48]' :
                    importResult.status === 'partial' ? 'text-[#B54708]' : 'text-[#B42318]'
                  }`}>
                    {importResult.status === 'success' ? 'Import Successful' :
                     importResult.status === 'partial' ? 'Partially Imported' : 'Import Failed'}
                  </span>
                </div>
                <ul className="text-[11px] space-y-0.5 text-[#475467]">
                  <li>• Current date: <strong>{importResult.currentInserted}</strong> rows upserted</li>
                  {importSply && (
                    <li>• SPLY rows: <strong>{importResult.splyInserted}</strong> upserted</li>
                  )}
                  {importResult.skipped > 0 && (
                    <li>• Skipped (name not found): <strong>{importResult.skipped}</strong> businesses</li>
                  )}
                  {importResult.errors.map((e, i) => (
                    <li key={i} className="text-red-600">• {e}</li>
                  ))}
                </ul>
                {importResult.status === 'success' && (
                  <p className="mt-2 text-[10px] text-[#027A48]">
                    Dashboard filter set to imported date. Realtime will reflect new figures automatically.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Right: Preview table ── */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-[#E4E7EC] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E7EC] shrink-0">
              <div>
                <h2 className="text-[13px] font-semibold text-[#344054]">Data Preview</h2>
                <p className="text-[11px] text-[#98A2B3] mt-0.5">
                  {parsedRows.length === 0
                    ? 'Upload a CSV to preview data before importing'
                    : `${parsedRows.length} rows · ${matchedCount} matched · ${unmatchedCount} unmatched`}
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                {businessesLoading ? (
                  <span className="flex items-center gap-1.5 text-[#667085] bg-[#F2F4F7] px-2.5 py-1 rounded-full">
                    <Loader2 className="size-3 animate-spin" />
                    Loading DB…
                  </span>
                ) : businessesError ? (
                  <span className="flex items-center gap-1.5 text-[#B42318] bg-[#FEF3F2] px-2.5 py-1 rounded-full font-medium">
                    <XCircle className="size-3" />
                    DB empty / error
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[#027A48] bg-[#ECFDF3] px-2.5 py-1 rounded-full font-medium">
                    <CheckCircle2 className="size-3" />
                    {businesses.length} SBUs in DB
                  </span>
                )}
                {parsedRows.length > 0 && (
                  <>
                    <span className="flex items-center gap-1.5 text-[#027A48] font-medium">
                      <span className="size-2 rounded-full bg-[#12B76A] inline-block" />
                      {matchedCount} Matched
                    </span>
                    {unmatchedCount > 0 && (
                      <span className="flex items-center gap-1.5 text-[#B42318] font-medium">
                        <span className="size-2 rounded-full bg-[#F04438] inline-block" />
                        {unmatchedCount} Not Found
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {parsedRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-16 px-6 text-center">
                <div className="size-14 bg-[#F2F4F7] rounded-2xl flex items-center justify-center mb-3">
                  <FileText className="size-6 text-[#98A2B3]" />
                </div>
                <p className="text-[13px] font-medium text-[#344054] mb-1">No file selected</p>
                <p className="text-[12px] text-[#98A2B3]">
                  Upload a CSV to preview rows here before importing
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E4E7EC]">
                    <tr>
                      <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-[#667085] whitespace-nowrap w-10">Status</th>
                      <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-[#667085]">Business</th>
                      <th className="py-2.5 px-4 text-right text-[11px] font-semibold text-[#667085]">Credit</th>
                      <th className="py-2.5 px-4 text-right text-[11px] font-semibold text-[#667085]">Cash</th>
                      <th className="py-2.5 px-4 text-right text-[11px] font-semibold text-[#667085]">Deposit</th>
                      <th className="py-2.5 px-4 text-right text-[11px] font-semibold text-[#667085]">Total</th>
                      {importSply && (
                        <th className="py-2.5 px-4 text-right text-[11px] font-semibold text-[#667085]">SPLY Total</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7]">
                    {matchedRows.map((row, i) => {
                      const total     = row.credit + row.cash + row.deposit;
                      const totalSPLY = row.creditSPLY + row.cashSPLY + row.depositSPLY;
                      const fmt = (n: number) =>
                        n > 0
                          ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : '—';

                      return (
                        <tr key={i} className={`${row.matchStatus === 'unmatched' ? 'bg-[#FEF3F2]' : 'hover:bg-[#F9FAFB]'} transition-colors`}>
                          <td className="py-2 px-4">
                            {row.matchStatus === 'matched' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#027A48] bg-[#ECFDF3] px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="size-2.5" /> Matched
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#B42318] bg-[#FEF3F2] px-2 py-0.5 rounded-full">
                                <XCircle className="size-2.5" /> Not Found
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-[12px] text-[#344054] font-medium max-w-[180px] truncate">
                            {row.business}
                          </td>
                          <td className="py-2 px-4 text-right text-[12px] text-[#667085]">{fmt(row.credit)}</td>
                          <td className="py-2 px-4 text-right text-[12px] text-[#667085]">{fmt(row.cash)}</td>
                          <td className="py-2 px-4 text-right text-[12px] text-[#667085]">{fmt(row.deposit)}</td>
                          <td className="py-2 px-4 text-right text-[12px] font-semibold text-[#1D2939]">
                            {fmt(total)}
                          </td>
                          {importSply && (
                            <td className="py-2 px-4 text-right text-[12px] text-[#667085]">{fmt(totalSPLY)}</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Totals footer */}
                  {matchedRows.length > 0 && (
                    <tfoot className="border-t-2 border-[#E4E7EC] bg-[#F9FAFB]">
                      <tr>
                        <td className="py-2.5 px-4 text-[11px] font-semibold text-[#667085]" colSpan={2}>
                          TOTAL ({matchedCount} matched)
                        </td>
                        <td className="py-2.5 px-4 text-right text-[12px] font-semibold text-[#344054]">
                          {matchedRows.filter(r => r.matchStatus === 'matched').reduce((s, r) => s + r.credit, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-right text-[12px] font-semibold text-[#344054]">
                          {matchedRows.filter(r => r.matchStatus === 'matched').reduce((s, r) => s + r.cash, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-right text-[12px] font-semibold text-[#344054]">
                          {matchedRows.filter(r => r.matchStatus === 'matched').reduce((s, r) => s + r.deposit, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-right text-[12px] font-bold text-[#1D2939]">
                          {matchedRows.filter(r => r.matchStatus === 'matched').reduce((s, r) => s + r.credit + r.cash + r.deposit, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {importSply && (
                          <td className="py-2.5 px-4 text-right text-[12px] font-semibold text-[#667085]">
                            {matchedRows.filter(r => r.matchStatus === 'matched').reduce((s, r) => s + r.creditSPLY + r.cashSPLY + r.depositSPLY, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        )}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
