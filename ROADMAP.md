# Collection Tracking Dashboard — Project Roadmap

> **Stack:** React (TypeScript) · Tailwind CSS · Supabase (PostgreSQL) · Recharts · React Router

---

## 1. Project Overview

A production-ready web dashboard that tracks, visualises, and manages collection data across all business units of the organisation. The system replaces manual CSV exports with a live, relational, multi-period database and provides role-aware access so finance teams can monitor performance versus several timeframes in real time.

### Source Data (Raw CSV — Decoded)

| Column | Meaning |
|---|---|
| `Business` | Business unit / SBU name |
| `Credit` | Credit collection — current period (Tk, millions) |
| `Cash` | Cash collection — current period |
| `Deposit` | Deposit collection — current period |
| `TotalCash` | Cash + Deposit — current period |
| `Total` | Credit + TotalCash — current period (grand total) |
| `CreditSPLY` | Credit — Same Period Last Year |
| `CashSPLY` | Cash — SPLY |
| `DepositSPLY` | Deposit — SPLY |
| `TotalCashSPLY` | TotalCash — SPLY |
| `TotalSPLY` | Grand total — SPLY |

55 business units are present in the sample, spanning agriculture, pharmaceuticals, FMCG, motors, electronics, and more.

---

## 2. Goals & Non-Goals

### Goals
- Real-time collection visibility across all SBUs
- Period-over-period (SPLY) comparison at every level — total, SBU, payment mode
- Clean, role-based data entry so finance teams can upload/input data without touching CSV
- Fully relational Supabase schema (no JSON blob storage)
- Export to CSV/Excel for downstream reporting
- Production-deployable on Vercel or Netlify

### Non-Goals (for this phase)
- ERP integration / SAP connector
- Mobile native app
- Predictive analytics / ML forecasting

---

## 3. Relational Database Schema (Supabase / PostgreSQL)

The schema is fully normalised into a star-schema style layout. All monetary values are stored as `NUMERIC(18,6)` to preserve the precision found in the source data.

### 3.1 Master / Dimension Tables

```sql
-- ─────────────────────────────────────────────────────────────
-- businesses  (SBU master)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE businesses (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL UNIQUE,          -- e.g. "ACI Foods Limited"
    short_code    TEXT,                           -- optional short alias
    category      TEXT,                           -- e.g. "Agri", "FMCG", "Motors"
    parent_id     UUID REFERENCES businesses(id), -- for SBU hierarchies
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order    INT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- payment_modes  (lookup — Credit / Cash / Deposit)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE payment_modes (
    id    SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name  TEXT NOT NULL UNIQUE   -- 'Credit' | 'Cash' | 'Deposit'
);

-- ─────────────────────────────────────────────────────────────
-- collection_periods  (time dimension)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE collection_periods (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fiscal_year    SMALLINT NOT NULL,             -- e.g. 2025
    month_number   SMALLINT CHECK (month_number BETWEEN 1 AND 12),
    period_label   TEXT NOT NULL,                 -- e.g. "Jul 2024 – Mar 2025 (9M)"
    period_type    TEXT NOT NULL                  -- 'monthly' | 'quarterly' | 'ytd' | 'custom'
                   CHECK (period_type IN ('monthly','quarterly','ytd','custom')),
    start_date     DATE NOT NULL,
    end_date       DATE NOT NULL,
    is_locked      BOOLEAN NOT NULL DEFAULT FALSE, -- prevent edits after sign-off
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (fiscal_year, month_number, period_type)
);
```

### 3.2 Fact Table

```sql
-- ─────────────────────────────────────────────────────────────
-- collection_records  (core fact table)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE collection_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
    period_id       UUID NOT NULL REFERENCES collection_periods(id) ON DELETE RESTRICT,
    sply_period_id  UUID REFERENCES collection_periods(id),   -- FK to the SPLY row

    -- current period amounts
    credit_amount   NUMERIC(18,6) NOT NULL DEFAULT 0,
    cash_amount     NUMERIC(18,6) NOT NULL DEFAULT 0,
    deposit_amount  NUMERIC(18,6) NOT NULL DEFAULT 0,

    -- generated columns (auto-computed by DB)
    total_cash_amount NUMERIC(18,6) GENERATED ALWAYS AS
                        (cash_amount + deposit_amount) STORED,
    total_amount      NUMERIC(18,6) GENERATED ALWAYS AS
                        (credit_amount + cash_amount + deposit_amount) STORED,

    data_source     TEXT DEFAULT 'manual',        -- 'manual' | 'csv_import' | 'api'
    notes           TEXT,
    created_by      UUID REFERENCES auth.users(id),
    updated_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (business_id, period_id)
);
```

> **SPLY linkage:** Instead of storing SPLY values as duplicate columns (as in the raw CSV), each `collection_record` row links to its `sply_period_id`. SPLY figures are simply the `collection_records` rows for that earlier period. This eliminates redundancy and keeps the schema DRY.

### 3.3 Supporting Tables

```sql
-- ─────────────────────────────────────────────────────────────
-- user_profiles  (extends Supabase auth.users)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE user_profiles (
    id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name    TEXT,
    role         TEXT NOT NULL DEFAULT 'viewer'
                 CHECK (role IN ('admin','editor','viewer')),
    department   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- import_logs  (audit trail for CSV imports)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE import_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imported_by     UUID REFERENCES auth.users(id),
    period_id       UUID REFERENCES collection_periods(id),
    file_name       TEXT,
    row_count       INT,
    status          TEXT CHECK (status IN ('success','partial','failed')),
    error_details   JSONB,
    imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3.4 Database Views (Pre-built for the Frontend)

```sql
-- Full current vs SPLY comparison per business per period
CREATE VIEW v_collection_summary AS
SELECT
    cr.id,
    b.name          AS business_name,
    b.category,
    cp.period_label,
    cp.fiscal_year,
    cp.month_number,

    cr.credit_amount,
    cr.cash_amount,
    cr.deposit_amount,
    cr.total_cash_amount,
    cr.total_amount,

    -- SPLY values via self-join
    sply.credit_amount    AS credit_sply,
    sply.cash_amount      AS cash_sply,
    sply.deposit_amount   AS deposit_sply,
    sply.total_cash_amount AS total_cash_sply,
    sply.total_amount     AS total_sply,

    -- Growth %
    ROUND(((cr.total_amount - sply.total_amount) / NULLIF(sply.total_amount,0)) * 100, 2)
        AS growth_pct

FROM collection_records cr
JOIN businesses b ON cr.business_id = b.id
JOIN collection_periods cp ON cr.period_id = cp.id
LEFT JOIN collection_records sply ON sply.business_id = cr.business_id
    AND sply.period_id = cr.sply_period_id;

-- Aggregated totals per period
CREATE VIEW v_period_totals AS
SELECT
    period_id,
    SUM(credit_amount)     AS total_credit,
    SUM(cash_amount)       AS total_cash,
    SUM(deposit_amount)    AS total_deposit,
    SUM(total_cash_amount) AS total_cash_and_deposit,
    SUM(total_amount)      AS grand_total
FROM collection_records
GROUP BY period_id;
```

### 3.5 Row-Level Security (RLS) Policies

```sql
-- Viewers can only SELECT
CREATE POLICY "Viewers can read collection records"
ON collection_records FOR SELECT
USING (auth.role() = 'authenticated');

-- Editors can INSERT/UPDATE non-locked periods
CREATE POLICY "Editors can write to unlocked periods"
ON collection_records FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin','editor')
    )
    AND EXISTS (
        SELECT 1 FROM collection_periods
        WHERE id = period_id AND is_locked = FALSE
    )
);

-- Only admins can delete
CREATE POLICY "Admins can delete"
ON collection_records FOR DELETE
USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
```

---

## 4. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 18 + TypeScript | Type safety, component reuse |
| **Routing** | React Router v6 (Data Mode) | Multi-page SPA with loader pattern |
| **Styling** | Tailwind CSS v4 | Utility-first, rapid iteration |
| **Charts** | Recharts | Composable, React-native |
| **State** | Zustand (lightweight) | Simple global state without boilerplate |
| **Forms** | React Hook Form + Zod | Typed validation, CSV import forms |
| **Backend** | Supabase (PostgreSQL 15) | Managed relational DB, Auth, Storage, Realtime |
| **Auth** | Supabase Auth (email+password) | Built-in, ties to RLS |
| **Export** | SheetJS (xlsx) | Client-side Excel/CSV export |
| **HTTP Client** | Supabase JS SDK v2 | Typed queries, real-time subscriptions |
| **Deployment** | Vercel (frontend) + Supabase cloud | Zero-ops, generous free tier |

---

## 5. Application Pages & Routes

```
/                          → Redirect to /dashboard
/login                     → Authentication page
/dashboard                 → Summary KPIs + top movers
/dashboard/collection      → Full collection table (all SBUs)
/dashboard/comparison      → Current vs SPLY side-by-side
/dashboard/trends          → Monthly trend line charts
/periods                   → Period management (admin)
/periods/new               → Create new period
/businesses                → SBU master list (admin)
/businesses/:id            → Individual SBU detail page
/import                    → CSV import wizard (editor/admin)
/settings                  → User profile, roles (admin)
/settings/users            → User management (admin)
```

---

## 6. Feature Specification

### 6.1 Dashboard Overview (`/dashboard`)
- **4 KPI Cards:** Total Collection · Total Credit · Total Cash · Total Deposit — each with SPLY delta (Tk + %)
- **Growth badge** (green/red) per KPI
- **Top 5 Gainers & Decliners** widget (SBU-level vs SPLY)
- **Payment Mode donut chart** (Credit / Cash / Deposit split)
- **Period selector** (dropdown) — all available periods

### 6.2 Collection Table (`/dashboard/collection`)
- Full paginated table of all SBUs
- Columns: Business · Credit · Cash · Deposit · Total Cash · Total · vs SPLY Δ · Growth %
- Sortable by every column
- Search / filter by SBU name or category
- Inline row highlight: green = growth, red = decline, grey = no data
- Sticky header + frozen first column

### 6.3 Period Comparison (`/dashboard/comparison`)
- Select **Period A** and **Period B** (any two periods)
- Side-by-side grouped bar chart
- Waterfall chart showing Δ by SBU
- Export to Excel button

### 6.4 Trend View (`/dashboard/trends`)
- Line chart: monthly Total collection over time per SBU (multi-select)
- Stacked area chart: Credit vs Cash vs Deposit over months
- Date range picker

### 6.5 CSV Import Wizard (`/import`)
- Step 1: Upload CSV — validate column headers against expected schema
- Step 2: Map period — select or create target `collection_period`
- Step 3: Preview — show parsed rows, highlight missing/invalid SBUs
- Step 4: Confirm — upsert into `collection_records`, log to `import_logs`
- Duplicate detection: warn if data already exists for that SBU + period

### 6.6 Manual Data Entry
- Inline editable cells in the collection table (editor/admin role)
- Auto-save with optimistic UI update
- Lock icon on locked periods — click triggers unlock request (admin only)

### 6.7 Period Management (`/periods`)
- CRUD for `collection_periods`
- Lock / unlock a period (admin only)
- Clone period → creates SPLY link for the next year automatically

### 6.8 SBU Master (`/businesses`)
- CRUD for `businesses`
- Assign category, parent SBU (hierarchy), active/inactive flag
- View all collection history for a single SBU

### 6.9 Authentication & Roles
| Role | Permissions |
|---|---|
| `admin` | Full access: CRUD all records, manage users, lock periods, delete data |
| `editor` | Can import CSV, manually enter data into unlocked periods |
| `viewer` | Read-only — all dashboard views, no data mutation |

### 6.10 Export
- Export any table view to **Excel (.xlsx)** or **CSV**
- Export entire period snapshot (all SBUs) in the original portal format
- Export charts as **PNG/SVG**

---

## 7. Development Phases

### Phase 0 — Setup & Schema
- [ ] Initialise React + TypeScript project with Tailwind CSS
- [ ] Set up React Router in Data Mode
- [ ] Connect Supabase project
- [ ] Run schema migrations (all tables, views, RLS)
- [ ] Seed `businesses` table from CSV (55 SBUs)
- [ ] Seed `payment_modes` (Credit, Cash, Deposit)
- [ ] Create first `collection_period` and import sample CSV data

### Phase 1 — Auth & Shell
- [ ] Login/logout flow using Supabase Auth
- [ ] `user_profiles` auto-created on sign-up via DB trigger
- [ ] Protected route wrapper (redirect to `/login` if unauthenticated)
- [ ] App shell: sidebar navigation, top bar, role-aware menu items
- [ ] Period selector component (global context)

### Phase 2 — Core Dashboard
- [ ] KPI cards with SPLY comparison
- [ ] Payment mode donut chart
- [ ] Top gainers/decliners widget
- [ ] Responsive layout (desktop primary, tablet-friendly)

### Phase 3 — Collection Table
- [ ] Full SBU collection table with sort, search, filter
- [ ] SPLY columns and growth % column
- [ ] Colour-coded growth badges
- [ ] Pagination or virtual scroll (for 55+ SBUs)

### Phase 4 — Charts & Comparison
- [ ] Period comparison page (grouped bar + waterfall)
- [ ] Trend page (line + stacked area)
- [ ] Date range picker component

### Phase 5 — Data Entry & Import
- [ ] Inline editable cells (editor/admin)
- [ ] CSV import wizard (4-step)
- [ ] Validation layer (Zod schema)
- [ ] Import audit log viewer

### Phase 6 — Admin Features
- [ ] Period management (CRUD, lock/unlock)
- [ ] SBU master management
- [ ] User management (invite, assign role)
- [ ] SBU detail page (individual history)

### Phase 7 — Polish & Production
- [ ] Export to Excel / CSV / PNG
- [ ] Error boundary & loading skeletons throughout
- [ ] Real-time updates via Supabase `SUBSCRIBE` (optional)
- [ ] Performance audit (React Query caching / Supabase indexes)
- [ ] Accessibility pass (keyboard nav, ARIA labels)
- [ ] Deploy to Vercel + configure env vars
- [ ] Write PostgREST / Supabase indexes for heavy queries
- [ ] Final QA and UAT with finance team

---

## 8. Supabase-Specific Configuration

### 8.1 Required Indexes
```sql
CREATE INDEX idx_collection_records_business ON collection_records(business_id);
CREATE INDEX idx_collection_records_period   ON collection_records(period_id);
CREATE INDEX idx_collection_records_created  ON collection_records(created_at DESC);
CREATE INDEX idx_businesses_category         ON businesses(category);
```

### 8.2 Database Trigger — `updated_at` auto-update
```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_collection_records_updated
BEFORE UPDATE ON collection_records
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- (Repeat for businesses, collection_periods)
```

### 8.3 Trigger — Auto-create user_profile on sign-up
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'viewer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 8.4 Environment Variables Required
```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 9. Folder Structure (Frontend)

```
src/
├── app/
│   ├── App.tsx                     # RouterProvider entry
│   ├── routes.tsx                  # createBrowserRouter config
│   └── components/
│       ├── layout/
│       │   ├── Sidebar.tsx
│       │   ├── TopBar.tsx
│       │   └── AppShell.tsx
│       ├── dashboard/
│       │   ├── KpiCard.tsx
│       │   ├── DonutChart.tsx
│       │   ├── TopMovers.tsx
│       │   └── PeriodSelector.tsx
│       ├── collection/
│       │   ├── CollectionTable.tsx
│       │   ├── CollectionRow.tsx
│       │   └── GrowthBadge.tsx
│       ├── charts/
│       │   ├── ComparisonBarChart.tsx
│       │   ├── TrendLineChart.tsx
│       │   └── WaterfallChart.tsx
│       ├── import/
│       │   ├── CsvUploadStep.tsx
│       │   ├── PeriodMapStep.tsx
│       │   ├── PreviewStep.tsx
│       │   └── ConfirmStep.tsx
│       └── ui/
│           ├── Button.tsx
│           ├── Badge.tsx
│           ├── Modal.tsx
│           ├── Table.tsx
│           └── Skeleton.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── CollectionPage.tsx
│   ├── ComparisonPage.tsx
│   ├── TrendsPage.tsx
│   ├── ImportPage.tsx
│   ├── PeriodsPage.tsx
│   ├── BusinessesPage.tsx
│   └── SettingsPage.tsx
├── lib/
│   ├── supabase.ts                 # Supabase client init
│   ├── api/
│   │   ├── collections.ts          # collection_records queries
│   │   ├── businesses.ts
│   │   ├── periods.ts
│   │   └── users.ts
│   ├── validators/
│   │   └── csvSchema.ts            # Zod schemas for import
│   └── utils/
│       ├── formatCurrency.ts
│       ├── calcGrowth.ts
│       └── exportExcel.ts
├── store/
│   ├── periodStore.ts              # Zustand — selected period
│   └── authStore.ts               # Zustand — current user/role
├── styles/
│   ├── theme.css
│   └── fonts.css
└── types/
    ├── database.types.ts           # Auto-generated from Supabase CLI
    └── app.types.ts
```

---

## 10. Key UX Decisions

| Decision | Rationale |
|---|---|
| Period selector is global (top bar) | Changing period updates all widgets simultaneously |
| SPLY is read from DB (not stored as columns) | Avoids data duplication, enables any period comparison |
| Growth % coloured red/green | Finance teams need instant visual signal |
| Lock mechanism on periods | Prevents accidental edits after month-close sign-off |
| CSV import wizard (4 steps) | Reduces data entry errors; maintains audit trail |
| Frozen first column in table | SBU names stay visible while scrolling wide data |

---

## 11. Data Seeding Plan (From Existing CSV)

1. **Seed `businesses`** — extract all 55 unique `Business` names; assign categories manually (or prompt user to categorise during onboarding)
2. **Create `collection_period`** — identify what period the sample CSV represents (e.g. "9M FY2025 — Jul 2024 to Mar 2025"); create corresponding SPLY period (Jul 2023 – Mar 2024)
3. **Insert `collection_records` (current)** — one row per SBU for the current period with `credit_amount`, `cash_amount`, `deposit_amount`
4. **Insert `collection_records` (SPLY)** — one row per SBU for the SPLY period using the `*SPLY` columns from the CSV
5. **Link** — update each current-period row's `sply_period_id` to point to the SPLY period

This is a one-time migration script (`scripts/seed.ts`) that runs via `tsx scripts/seed.ts`.

---

## 12. Open Questions (To Resolve Before Phase 1)

1. **What period does the sample CSV cover?** (month, FY) — needed to set up `collection_periods` correctly
2. **Are there more payment modes** beyond Credit / Cash / Deposit?
3. **Is there a Business category taxonomy** already in use, or does it need to be defined?
4. **Who are the intended user roles?** (e.g. CFO = viewer, Finance Ops = editor, IT Admin = admin)
5. **Is multi-company support needed?** (i.e. will other group companies ever use this dashboard?)
6. **What is the target fiscal year start month?** (July → June = common in Bangladesh)
7. **Should the Figma design dictate a light-only or dark/light toggle UI?**

---

## 13. Out-of-Scope (Future Phases)

- Forecasting / budget vs actual comparison
- Push notifications (email alerts when collection drops below target)
- Mobile app (React Native)
- ERP / SAP data connector
- Multi-language support

---

*Last updated: April 2026 | Status: Pre-development planning*
