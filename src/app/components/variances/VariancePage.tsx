import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase }  from '../../../lib/supabaseClient';
import { TopBar }    from '../layout/TopBar';

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

interface Business {
  id:         string;
  name:       string;
  category:   string | null;
  sort_order: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  'Pharmaceuticals',
  'Agribusiness',
  'Consumer Brands',
  'CC&PH',
  'Logistics',
];

const PORTFOLIO_LABELS: Record<string, string> = {
  'Pharmaceuticals': 'Pharma Portfolio',
  'Agribusiness':    'Agri Portfolio',
  'Consumer Brands': 'CB Portfolio',
  'CC&PH':           'CC&PH Portfolio',
  'Logistics':       'Logistics Portfolio',
};

const MONTH_NAMES  = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
const MONTH_SHORT  = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec'];

// ─────────────────────────────────────────────────────────────────────────────
//  Formatters
// ─────────────────────────────────────────────────────────────────────────────

function formatDayLabel(dateStr: string) {
  const [yr, mo, dy] = dateStr.split('-');
  return `${parseInt(dy)}-${MONTH_SHORT[parseInt(mo) - 1]}-${yr.slice(2)}`;
}

function fmtNum(v: number): string {
  if (v === 0) return '-';
  return v.toFixed(2);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function VarianceCell({ v }: { v: number }) {
  if (v === 0) return <span className="text-[#98A2B3]">-</span>;
  if (v < 0)   return <span className="text-[#D92D20]">({Math.abs(v).toFixed(2)})</span>;
  return <span>{v.toFixed(2)}</span>;
}

function PortfolioVarianceCell({ v }: { v: number }) {
  if (v === 0) return <span className="text-[#98A2B3]">-</span>;
  if (v < 0)   return <span className="text-[#D92D20]">({Math.abs(v).toFixed(2)})</span>;
  return <span>{v.toFixed(2)}</span>;
}

function AciVarianceCell({ v }: { v: number }) {
  if (v === 0) return <span className="text-[#98A2B3]">-</span>;
  if (v < 0)   return <span className="text-[#D92D20]">({Math.abs(v).toFixed(2)})</span>;
  return <span className="text-[#027A48]">{v.toFixed(2)}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Column widths
// ─────────────────────────────────────────────────────────────────────────────

const NAME_W  = 188;   // px — sticky left column
const NUM_W   = 70;    // px — each of the 3 data sub-columns per day

// ─────────────────────────────────────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────────────────────────────────────

export function VariancePage() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [collMap,    setCollMap]    = useState<Map<string, number>>(new Map());
  const [projMap,    setProjMap]    = useState<Map<string, number>>(new Map());
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // ── Derived date range ───────────────────────────────────────────────────
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay    = new Date(year, month, 0).getDate();
  const monthEnd   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const days = useMemo<string[]>(() => {
    const arr: string[] = [];
    for (let d = 1; d <= lastDay; d++) {
      arr.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return arr;
  }, [year, month, lastDay]);

  // ── Fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      supabase
        .from('businesses')
        .select('id, name, category, sort_order')
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('collection_records')
        .select('business_id, collection_date, total_amount')
        .gte('collection_date', monthStart)
        .lte('collection_date', monthEnd),
      supabase
        .from('business_projections')
        .select('business_id, projection_date, total_target')
        .gte('projection_date', monthStart)
        .lte('projection_date', monthEnd),
    ])
      .then(([bizRes, colRes, projRes]) => {
        if (cancelled) return;
        if (bizRes.error)  throw new Error(`Businesses: ${bizRes.error.message}`);
        if (colRes.error)  throw new Error(`Collections: ${colRes.error.message}`);
        if (projRes.error) throw new Error(`Projections: ${projRes.error.message}`);

        setBusinesses(bizRes.data ?? []);

        const cm = new Map<string, number>();
        for (const r of colRes.data ?? []) {
          cm.set(`${r.business_id}|${r.collection_date}`, Number(r.total_amount));
        }
        setCollMap(cm);

        const pm = new Map<string, number>();
        for (const r of projRes.data ?? []) {
          pm.set(`${r.business_id}|${r.projection_date}`, Number(r.total_target));
        }
        setProjMap(pm);
        setLoading(false);
      })
      .catch(err => {
        if (!cancelled) { setError(err.message ?? String(err)); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [monthStart, monthEnd]);

  // ── Lookup helpers ───────────────────────────────────────────────────────
  const getActual = useCallback(
    (bizId: string, date: string) => collMap.get(`${bizId}|${date}`) ?? 0,
    [collMap],
  );
  const getProj = useCallback(
    (bizId: string, date: string) => projMap.get(`${bizId}|${date}`) ?? 0,
    [projMap],
  );

  // ── Group businesses by category ─────────────────────────────────────────
  const grouped = useMemo<Record<string, Business[]>>(() => {
    const g: Record<string, Business[]> = {};
    for (const b of businesses) {
      const cat = b.category ?? 'Other';
      if (!g[cat]) g[cat] = [];
      g[cat].push(b);
    }
    return g;
  }, [businesses]);

  // ── Category day totals ──────────────────────────────────────────────────
  const catTotals = useMemo<Record<string, Record<string, { p: number; a: number; v: number }>>>(() => {
    const result: Record<string, Record<string, { p: number; a: number; v: number }>> = {};
    for (const cat of Object.keys(grouped)) {
      result[cat] = {};
      for (const d of days) {
        const p = (grouped[cat] ?? []).reduce((s, b) => s + getProj(b.id, d),   0);
        const a = (grouped[cat] ?? []).reduce((s, b) => s + getActual(b.id, d), 0);
        result[cat][d] = { p, a, v: a - p };
      }
    }
    return result;
  }, [grouped, days, getProj, getActual]);

  // ── ACI Group day totals ─────────────────────────────────────────────────
  const aciTotals = useMemo<Record<string, { p: number; a: number; v: number }>>(() => {
    const result: Record<string, { p: number; a: number; v: number }> = {};
    for (const d of days) {
      const p = businesses.reduce((s, b) => s + getProj(b.id, d),   0);
      const a = businesses.reduce((s, b) => s + getActual(b.id, d), 0);
      result[d] = { p, a, v: a - p };
    }
    return result;
  }, [businesses, days, getProj, getActual]);

  // ── Month navigation ─────────────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  // ── Ordered categories (known first, then any extras) ────────────────────
  const orderedCats = [
    ...CATEGORY_ORDER.filter(c => grouped[c]?.length),
    ...Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c) && grouped[c]?.length),
  ];

  // ─────────────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────────────

  const SHARED_NUM_TD = `text-right text-[12px] px-2 py-[5px] whitespace-nowrap border-r border-b border-[#E4E7EC]`;
  const SHARED_NUM_TH = `text-right text-[11px] font-medium text-[#667085] px-2 py-[7px] whitespace-nowrap border-r border-b border-[#E4E7EC] bg-[#F9FAFB]`;

  return (
    <>
      <TopBar />
      <main
        className="flex-1 overflow-hidden p-5 min-h-0 flex flex-col"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        {/* ── Card ─────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#E4E7EC] flex flex-col flex-1 min-h-0 overflow-hidden">

          {/* ── Card header ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E7EC] shrink-0">
            <div>
              <h2 className="text-[17px] font-semibold text-[#1D2939]">Cash Flow Variance Analysis</h2>
              <p className="text-[12px] text-[#667085] mt-0.5">Day-wise Projection vs. Collection — values in BDT millions</p>
            </div>

            {/* Month navigator */}
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg border border-[#E4E7EC] hover:bg-[#F9FAFB] text-[#667085] transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[14px] font-semibold text-[#1D2939] min-w-[148px] text-center select-none">
                {MONTH_NAMES[month - 1]} {year}
              </span>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg border border-[#E4E7EC] hover:bg-[#F9FAFB] text-[#667085] transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* ── Error banner ────────────────────────────────────────────────── */}
          {error && (
            <p className="px-6 py-2 text-[12px] text-[#D92D20] shrink-0 bg-[#FEF3F2] border-b border-[#FECDCA]">
              ⚠ {error}
            </p>
          )}

          {/* ── Table scroll area ───────────────────────────────────────────── */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="w-8 h-8 border-2 border-[#E4E7EC] border-t-[#465FFF] rounded-full animate-spin" />
                <span className="text-[13px] text-[#667085]">Loading variance data…</span>
              </div>
            ) : (
              <table
                className="border-collapse"
                style={{ minWidth: NAME_W + days.length * NUM_W * 3, tableLayout: 'fixed' }}
              >
                {/* ── COL GROUP (widths) ────────────────────────────────────── */}
                <colgroup>
                  <col style={{ width: NAME_W, minWidth: NAME_W }} />
                  {days.flatMap(d => [
                    <col key={`${d}-p`} style={{ width: NUM_W, minWidth: NUM_W }} />,
                    <col key={`${d}-a`} style={{ width: NUM_W, minWidth: NUM_W }} />,
                    <col key={`${d}-v`} style={{ width: NUM_W, minWidth: NUM_W }} />,
                  ])}
                </colgroup>

                {/* ── THEAD ────────────────────────────────────────────────── */}
                <thead className="sticky top-0 z-30">

                  {/* Row 1 — date labels */}
                  <tr>
                    <th
                      className="sticky left-0 bg-[#F9FAFB] border-r border-b border-[#E4E7EC] text-left text-[12px] font-semibold text-[#667085] px-4 py-2"
                      style={{ zIndex: 40, width: NAME_W, minWidth: NAME_W }}
                    >
                      Date
                    </th>
                    {days.map(d => (
                      <th
                        key={d}
                        colSpan={3}
                        className="bg-[#F0F9FF] border-r border-b border-[#E4E7EC] text-center text-[12px] font-semibold text-[#026AA2] px-2 py-2 whitespace-nowrap"
                      >
                        {formatDayLabel(d)}
                      </th>
                    ))}
                  </tr>

                  {/* Row 2 — sub-column labels */}
                  <tr>
                    <th
                      className="sticky left-0 bg-[#F9FAFB] border-r border-b border-t border-[#E4E7EC]"
                      style={{ zIndex: 40, width: NAME_W, minWidth: NAME_W }}
                    />
                    {days.map(d => (
                      <React.Fragment key={d}>
                        <th className={SHARED_NUM_TH}>Projected</th>
                        <th className={SHARED_NUM_TH}>Actual</th>
                        <th className={SHARED_NUM_TH}>Variance</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                {/* ── TBODY ────────────────────────────────────────────────── */}
                <tbody>
                  {orderedCats.map(cat => {
                    const bizzes = grouped[cat] ?? [];
                    const portfolioLabel = PORTFOLIO_LABELS[cat] ?? `${cat} Portfolio`;

                    return (
                      <React.Fragment key={cat}>

                        {/* Category header row 
                        <tr>
                          <td
                            className="sticky left-0 z-10 text-white font-semibold text-[12px] px-4 py-[7px] border-b border-r border-[#344054] tracking-wide"
                            style={{ background: '#1D2939', width: NAME_W, minWidth: NAME_W }}
                          >
                            {cat}
                          </td>
                          {days.flatMap(d => [
                            <td key={`ch-${cat}-${d}-p`} className="border-b border-r border-[#344054] bg-[#1D2939]" />,
                            <td key={`ch-${cat}-${d}-a`} className="border-b border-r border-[#344054] bg-[#1D2939]" />,
                            <td key={`ch-${cat}-${d}-v`} className="border-b border-r border-[#344054] bg-[#1D2939]" />,
                          ])}
                        </tr>
                        */}

                        {/* Individual business rows */}
                        {bizzes.map((biz, rowIdx) => {
                          const rowBg = rowIdx % 2 === 0 ? '#ffffff' : '#fef3f266';
                          return (
                            <tr key={biz.id}>
                              <td
                                className="sticky left-0 z-10 text-[12px] font-medium text-[#344054] px-4 py-2.3 border-b border-r border-[#E4E7EC] overflow-hidden"
                                style={{ background: rowBg, width: NAME_W, minWidth: NAME_W, maxWidth: NAME_W }}
                                title={biz.name}
                              >
                                {biz.name}
                              </td>
                              {days.map(d => {
                                const p = getProj(biz.id, d);
                                const a = getActual(biz.id, d);
                                const v = a - p;
                                return (
                                  <React.Fragment key={d}>
                                    <td className={SHARED_NUM_TD} style={{ background: rowBg }}>{fmtNum(p)}</td>
                                    <td className={SHARED_NUM_TD} style={{ background: rowBg }}>{fmtNum(a)}</td>
                                    <td className={SHARED_NUM_TD} style={{ background: rowBg }}><VarianceCell v={v} /></td>
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          );
                        })}

                        {/* Portfolio total row */}
                        <tr>
                          <td
                            className="sticky left-0 z-10 text-[#1D2939] font-bold text-[12px] px-4 py-2.5 border-b-2 border-r border-[#E4E7EC]"
                            style={{ background: '#F9FAFB', width: NAME_W, minWidth: NAME_W }}
                          >
                            {portfolioLabel}
                          </td>
                          {days.map(d => {
                            const cell = catTotals[cat]?.[d] ?? { p: 0, a: 0, v: 0 };
                            return (
                              <React.Fragment key={d}>
                                <td className="text-right font-bold text-[12px] px-2 py-2 border-b-2 border-r border-[#E4E7EC] whitespace-nowrap bg-[#F9FAFB]">
                                  {fmtNum(cell.p)}
                                </td>
                                <td className="text-right font-bold text-[12px] px-2 py-2 border-b-2 border-r border-[#E4E7EC] whitespace-nowrap bg-[#F9FAFB]">
                                  {fmtNum(cell.a)}
                                </td>
                                <td className="text-right font-bold text-[12px] px-2 py-2 border-b-2 border-r border-[#E4E7EC] whitespace-nowrap bg-[#F9FAFB]">
                                  <PortfolioVarianceCell v={cell.v} />
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>

                      </React.Fragment>
                    );
                  })}

                  {/* ── ACI Group grand total ─────────────────────────────── */}
                  <tr>
                    <td
                      className="sticky left-0 z-10 text-[#1D2939] font-bold text-[13px] px-4 py-2 border-t-2 border-r border-[#E4E7EC]"
                      style={{ background: '#F9FAFB', width: NAME_W, minWidth: NAME_W }}
                    >
                      ACI Group
                    </td>
                    {days.map(d => {
                      const cell = aciTotals[d] ?? { p: 0, a: 0, v: 0 };
                      return (
                        <React.Fragment key={d}>
                          <td className="text-right font-bold text-[13px] px-2 py-2 border-t-2 border-r border-[#E4E7EC] whitespace-nowrap bg-[#F9FAFB]">
                            {fmtNum(cell.p)}
                          </td>
                          <td className="text-right font-bold text-[13px] px-2 py-2 border-t-2 border-r border-[#E4E7EC] whitespace-nowrap bg-[#F9FAFB]">
                            {fmtNum(cell.a)}
                          </td>
                          <td className="text-right font-bold text-[13px] px-2 py-2 border-t-2 border-r border-[#E4E7EC] whitespace-nowrap bg-[#F9FAFB]">
                            <AciVarianceCell v={cell.v} />
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>

                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
