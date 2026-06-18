# Collection Tracking Dashboard — Complete SQL Reference (v2 — Daily-Base Schema)

> **Engine:** PostgreSQL 15 (Supabase)
> **Schema version:** v2 — `collection_periods` eliminated; `collection_date DATE` is the single time axis.
> **Execution order matters** — run sections top-to-bottom in Supabase SQL Editor.

---

## Architecture Decision — Why Remove `collection_periods`?

### The Problem with v1

The original schema pre-defined period rows (`monthly`, `quarterly`, `ytd`, `custom`) in a
`collection_periods` table and linked every `collection_records` row to one period via a UUID FK.
This created several structural problems:

1. **Period rows had to be created before any data could be entered.** Importing a CSV required first
   inserting a `collection_periods` row, resolving its UUID, and then using that UUID as a FK on
   every record — a two-step process that was easy to break.

2. **Aggregation granularity was locked at import time.** A record stored against a `ytd` period
   could not be re-sliced to show a single month, quarter, or arbitrary date range without a new
   period row and a re-import.

3. **SPLY was handled via a `sply_period_id` FK**, which required a matching prior-year period row
   to exist in `collection_periods` before current-year data could be linked to it. Forgetting to
   create the SPLY period silently broke all growth calculations.

4. **No true daily resolution.** A "daily" period would require 365 × 2 (current + SPLY) period
   rows per fiscal year — impractical and defeating the purpose.

### The v2 Solution

**`collection_date DATE NOT NULL`** replaces `period_id` and `sply_period_id` as the sole time
dimension on `collection_records`.

- Every row stores the **actual calendar date** of the collection event.
- One row per SBU per day: `UNIQUE (business_id, collection_date)`.
- **All aggregations** — daily, weekly, monthly, quarterly, YTD, fiscal year, or any custom range —
  are computed on the fly by passing `date_from` / `date_to` to parameterised PostgreSQL functions
  (called via Supabase RPC) or by filtering the base view `v_daily_collection` on `collection_date`.
- **SPLY** is computed by the application: subtract exactly one year from both `date_from` and
  `date_to` to get the same-period-last-year window. No stored FK needed.
- **Date locking** (replacing `is_locked` on periods) is handled by a lightweight `date_locks`
  table: admins lock specific dates; RLS on `collection_records` rejects writes to locked dates.

### Import Compatibility

| Mode | How it works |
|---|---|
| **Daily (target state)** | Each CSV represents one day's collection. `collection_date = the date the data was collected`. One row per SBU per day. |
| **Historical snapshot** | Cumulative CSV (e.g. 9M FY2025) is loaded with `collection_date = period_end_date` (e.g. `2025-03-31`). Querying `date_from = 2024-07-01`, `date_to = 2025-03-31` returns the correct 9-month aggregate because the SUM of all rows in that range equals the period total, whether the data arrives as 274 daily rows or a single snapshot row on the end date. Both patterns are mathematically consistent. |

---

## Table of Contents

1. [ENUM Types](#1-enum-types)
2. [Table Definitions](#2-table-definitions)
3. [Fiscal Calendar Functions](#3-fiscal-calendar-functions)
4. [Indexes](#4-indexes)
5. [Trigger Functions & Triggers](#5-trigger-functions--triggers)
6. [Base View](#6-base-view)
7. [RPC Aggregation Functions](#7-rpc-aggregation-functions)
8. [Row-Level Security](#8-row-level-security)
9. [Seed Data](#9-seed-data)
10. [Filter Presets Reference (Frontend)](#10-filter-presets-reference-frontend)
11. [Common Application Queries](#11-common-application-queries)
12. [Supabase Integration — Setup](#12-supabase-integration--setup)
13. [React Hook Library](#13-react-hook-library)
14. [Component Migration Map](#14-component-migration-map)
15. [Migration Guide — v1 → v2](#15-migration-guide--v1--v2)
16. [Maintenance & Utility Queries](#16-maintenance--utility-queries)
17. [Teardown Script](#17-teardown-script)

---

## 1. ENUM Types

```sql
-- ══════════════════════════════════════════════════════════════
--  1. ENUM TYPES
--  Run this before any table creation.
-- ══════════════════════════════════════════════════════════════

CREATE TYPE payment_mode_type AS ENUM ('Credit', 'Cash', 'Deposit');

-- Enumerate valid values at any time (useful for UI dropdowns):
-- SELECT unnest(enum_range(NULL::payment_mode_type)) AS payment_mode;
-- Returns: Credit | Cash | Deposit
```

---

## 2. Table Definitions

Four tables. No `collection_periods`. Creation order: `businesses` → `collection_records` →
`user_profiles` → `import_logs` → `date_locks`.

```sql
-- ══════════════════════════════════════════════════════════════
--  2A. BUSINESSES  (SBU master — dimension table)
--  Unchanged from v1.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE businesses (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT         NOT NULL UNIQUE,        -- e.g. "ACI Foods Limited"
    short_code  TEXT,                                -- optional alias / abbreviation
    category    TEXT,                                -- e.g. 'FMCG', 'Motors', 'Pharma'
    parent_id   UUID         REFERENCES businesses(id) ON DELETE SET NULL,
                                                     -- self-ref for SBU hierarchy
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order  INT,                                 -- controls display order in tables
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ══════════════════════════════════════════════════════════════
--  2B. COLLECTION RECORDS  (core fact table — v2 redesign)
--
--  Key changes vs v1:
--    • period_id      REMOVED  (was UUID FK → collection_periods)
--    • sply_period_id REMOVED  (SPLY is now a computed date range)
--    • collection_date ADDED   (DATE — the actual calendar day)
--    • UNIQUE constraint changed to (business_id, collection_date)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE collection_records (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Dimension FKs
    business_id      UUID           NOT NULL
                                    REFERENCES businesses(id) ON DELETE RESTRICT,

    -- Time dimension — the calendar date this collection belongs to
    collection_date  DATE           NOT NULL,

    -- Amounts (BDT millions, 6 decimal places)
    credit_amount    NUMERIC(18,6)  NOT NULL DEFAULT 0,
    cash_amount      NUMERIC(18,6)  NOT NULL DEFAULT 0,
    deposit_amount   NUMERIC(18,6)  NOT NULL DEFAULT 0,

    -- Computed columns — maintained automatically by the database engine
    total_cash_amount  NUMERIC(18,6)
                       GENERATED ALWAYS AS (cash_amount + deposit_amount) STORED,
    total_amount       NUMERIC(18,6)
                       GENERATED ALWAYS AS (credit_amount + cash_amount + deposit_amount) STORED,

    -- Metadata
    data_source      TEXT           DEFAULT 'manual'
                                    CHECK (data_source IN ('manual', 'csv_import', 'api')),
    notes            TEXT,
    created_by       UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by       UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    -- One record per business per day (natural primary grain)
    UNIQUE (business_id, collection_date)
);


-- ══════════════════════════════════════════════════════════════
--  2C. USER PROFILES  (extends Supabase auth.users)
--  Unchanged from v1.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE user_profiles (
    id          UUID         PRIMARY KEY
                             REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT,
    role        TEXT         NOT NULL DEFAULT 'viewer'
                             CHECK (role IN ('admin', 'editor', 'viewer')),
    department  TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ══════════════════════════════════════════════════════════════
--  2D. IMPORT LOGS  (audit trail for every CSV import)
--
--  Key changes vs v1:
--    • period_id REMOVED
--    • collection_date ADDED — the date the imported data represents
--      (for a single-day CSV this is the collection day; for a
--       snapshot import it is the period end date)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE import_logs (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    imported_by      UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
    collection_date  DATE,        -- the date the rows in this import represent
    file_name        TEXT,
    row_count        INT,
    status           TEXT         CHECK (status IN ('success', 'partial', 'failed')),
    error_details    JSONB,       -- per-row errors: [{ row: 5, message: "..." }]
    skipped_businesses  TEXT[],   -- SBU names that could not be matched
    imported_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ══════════════════════════════════════════════════════════════
--  2E. DATE LOCKS  (replaces is_locked on collection_periods)
--
--  Admins insert rows here to prevent edits on specific collection
--  dates. RLS on collection_records checks this table on every
--  INSERT / UPDATE / DELETE.
--
--  Locking a date range = insert one row per date in that range,
--  or use the helper function lock_date_range() in Section 3.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE date_locks (
    collection_date  DATE         PRIMARY KEY,
    locked_by        UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
    locked_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    notes            TEXT
);
```

---

## 3. Fiscal Calendar Functions

ACI Group's fiscal year runs **July 1 → June 30** (FY2025 = Jul 2024 – Jun 2025).
These helper functions are used inside the RPC aggregation functions in Section 7.

```sql
-- ══════════════════════════════════════════════════════════════
--  3A. fiscal_year(date)
--  Returns the fiscal year a date belongs to.
--  July 2024 – June 2025 → 2025.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fiscal_year(d DATE)
RETURNS SMALLINT
LANGUAGE SQL IMMUTABLE STRICT AS $$
    SELECT CASE
        WHEN EXTRACT(MONTH FROM d) >= 7
        THEN (EXTRACT(YEAR FROM d)::SMALLINT + 1)
        ELSE  EXTRACT(YEAR FROM d)::SMALLINT
    END;
$$;


-- ══════════════════════════════════════════════════════════════
--  3B. fiscal_quarter(date)
--  Returns the fiscal quarter (1-4) within the fiscal year.
--  Q1 = Jul–Sep | Q2 = Oct–Dec | Q3 = Jan–Mar | Q4 = Apr–Jun
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fiscal_quarter(d DATE)
RETURNS SMALLINT
LANGUAGE SQL IMMUTABLE STRICT AS $$
    SELECT CASE
        WHEN EXTRACT(MONTH FROM d) IN (7, 8, 9)   THEN 1
        WHEN EXTRACT(MONTH FROM d) IN (10, 11, 12) THEN 2
        WHEN EXTRACT(MONTH FROM d) IN (1, 2, 3)   THEN 3
        WHEN EXTRACT(MONTH FROM d) IN (4, 5, 6)   THEN 4
    END::SMALLINT;
$$;


-- ══════════════════════════════════════════════════════════════
--  3C. fiscal_year_start(fiscal_year)
--  Returns the DATE of the first day of a given fiscal year.
--  fiscal_year_start(2025) → '2024-07-01'
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fiscal_year_start(fy SMALLINT)
RETURNS DATE
LANGUAGE SQL IMMUTABLE STRICT AS $$
    SELECT make_date(fy - 1, 7, 1);
$$;


-- ══════════════════════════════════════════════════════════════
--  3D. fiscal_quarter_start(date)
--  Returns the DATE of the first day of the fiscal quarter that
--  contains the input date.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fiscal_quarter_start(d DATE)
RETURNS DATE
LANGUAGE SQL IMMUTABLE STRICT AS $$
    SELECT CASE
        WHEN EXTRACT(MONTH FROM d) IN (7, 8, 9)   THEN make_date(EXTRACT(YEAR FROM d)::INT,  7, 1)
        WHEN EXTRACT(MONTH FROM d) IN (10, 11, 12) THEN make_date(EXTRACT(YEAR FROM d)::INT, 10, 1)
        WHEN EXTRACT(MONTH FROM d) IN (1, 2, 3)   THEN make_date(EXTRACT(YEAR FROM d)::INT,  1, 1)
        WHEN EXTRACT(MONTH FROM d) IN (4, 5, 6)   THEN make_date(EXTRACT(YEAR FROM d)::INT,  4, 1)
    END::DATE;
$$;


-- ══════════════════════════════════════════════════════════════
--  3E. sply_range(date_from, date_to)  →  (sply_from, sply_to)
--  Shifts a date range back exactly one year using PostgreSQL
--  interval arithmetic (correctly handles leap years).
--  Used by RPC functions to compute SPLY windows automatically.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sply_range(
    p_from DATE,
    p_to   DATE,
    OUT sply_from DATE,
    OUT sply_to   DATE
)
LANGUAGE SQL IMMUTABLE STRICT AS $$
    SELECT
        (p_from - INTERVAL '1 year')::DATE,
        (p_to   - INTERVAL '1 year')::DATE;
$$;


-- ══════════════════════════════════════════════════════════════
--  3F. lock_date_range(date_from, date_to, notes)
--  Admin helper: inserts one date_locks row per calendar day in
--  the given range. Call via Supabase RPC (admin role only).
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION lock_date_range(
    p_from  DATE,
    p_to    DATE,
    p_notes TEXT DEFAULT NULL
)
RETURNS INT          -- number of dates newly locked
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_date DATE := p_from;
    v_count INT := 0;
BEGIN
    WHILE v_date <= p_to LOOP
        INSERT INTO date_locks (collection_date, locked_by, notes)
        VALUES (v_date, auth.uid(), p_notes)
        ON CONFLICT (collection_date) DO NOTHING;
        v_count := v_count + 1;
        v_date  := v_date + 1;
    END LOOP;
    RETURN v_count;
END;
$$;


-- ══════════════════════════════════════════════════════════════
--  3G. unlock_date_range(date_from, date_to)
--  Admin helper: removes date_locks rows in the given range.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION unlock_date_range(
    p_from DATE,
    p_to   DATE
)
RETURNS INT          -- number of dates unlocked
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT;
BEGIN
    DELETE FROM date_locks
    WHERE collection_date BETWEEN p_from AND p_to;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;
```

---

## 4. Indexes

```sql
-- ══════════════════════════════════════════════════════════════
--  4. INDEXES
--  Run after table creation.
-- ══════════════════════════════════════════════════════════════

-- ── collection_records ────────────────────────────────────────

-- Primary time-axis lookup: all records for a date range
CREATE INDEX idx_cr_collection_date
    ON collection_records(collection_date DESC);

-- Composite: lookup all records for one SBU over a date range
CREATE INDEX idx_cr_business_date
    ON collection_records(business_id, collection_date DESC);

-- Fiscal year fast-path: pull all records for a fiscal year
-- (used by the monthly trend chart and YTD aggregation)
CREATE INDEX idx_cr_fiscal_year
    ON collection_records(fiscal_year(collection_date), collection_date);

-- Fiscal quarter fast-path
CREATE INDEX idx_cr_fiscal_quarter
    ON collection_records(
        fiscal_year(collection_date),
        fiscal_quarter(collection_date),
        collection_date
    );

-- Calendar month fast-path (used by MTD queries) Has not queried*
CREATE INDEX idx_cr_year_month
    ON collection_records(
        EXTRACT(YEAR FROM collection_date)::SMALLINT,
        EXTRACT(MONTH FROM collection_date)::SMALLINT
    );

-- Recency index for "latest dates with data" query
CREATE INDEX idx_cr_created_at
    ON collection_records(created_at DESC);

-- ── businesses ───────────────────────────────────────────────

CREATE INDEX idx_biz_category  ON businesses(category);
CREATE INDEX idx_biz_parent_id ON businesses(parent_id);
CREATE INDEX idx_biz_active    ON businesses(is_active);
CREATE INDEX idx_biz_sort      ON businesses(sort_order);

-- ── import_logs ──────────────────────────────────────────────

CREATE INDEX idx_il_collection_date ON import_logs(collection_date DESC);
CREATE INDEX idx_il_imported_by     ON import_logs(imported_by);
CREATE INDEX idx_il_imported_at     ON import_logs(imported_at DESC);

-- ── date_locks ───────────────────────────────────────────────

-- PK already creates an index on collection_date — no extra needed.
```

---

## 5. Trigger Functions & Triggers

```sql
-- ══════════════════════════════════════════════════════════════
--  5A. set_updated_at()
--  Generic trigger — stamps updated_at = NOW() on every UPDATE.
--  Shared across all tables that have the column.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ══════════════════════════════════════════════════════════════
--  5B. handle_new_user()
--  Fires after a new row is inserted into auth.users.
--  Auto-creates a user_profiles row with the default 'viewer' role.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, full_name, role)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        'viewer'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ══════════════════════════════════════════════════════════════
--  5C. updated_at triggers (one per table with the column)
-- ══════════════════════════════════════════════════════════════

CREATE TRIGGER trg_businesses_updated
    BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_collection_records_updated
    BEFORE UPDATE ON collection_records
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_profiles_updated
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- import_logs and date_locks are append-only — no updated_at triggers.


-- ══════════════════════════════════════════════════════════════
--  5D. Auto-create user_profile on Supabase sign-up
-- ══════════════════════════════════════════════════════════════

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 6. Base View

```sql
-- ══════════════════════════════════════════════════════════════
--  6A. v_daily_collection
--
--  Denormalised base view — one row per active business per
--  collection_date. Exposes fiscal calendar derived columns so
--  the application can filter on any of:
--
--    collection_date           → exact day
--    fiscal_year               → e.g. 2025
--    fiscal_quarter            → 1-4
--    month_number              → 1-12 (calendar)
--    iso_week                  → 1-53
--
--  PostgREST (Supabase JS) can filter this view directly:
--
--    supabase.from('v_daily_collection')
--      .select('*')
--      .gte('collection_date', '2024-07-01')
--      .lte('collection_date', '2025-03-31')
--      .order('total_amount', { ascending: false })
--
--  For aggregated totals (SUM across SBUs or dates) use the
--  RPC functions in Section 7 instead.
-- ══════════════════════════════════════════════════════════════

CREATE VIEW v_daily_collection AS
SELECT
    cr.id                                                       AS record_id,

    -- Time dimension
    cr.collection_date,
    fiscal_year(cr.collection_date)                             AS fiscal_year,
    fiscal_quarter(cr.collection_date)                          AS fiscal_quarter,
    EXTRACT(MONTH FROM cr.collection_date)::SMALLINT            AS month_number,
    TO_CHAR(cr.collection_date, 'YYYY-MM')                      AS year_month,
    EXTRACT(WEEK  FROM cr.collection_date)::SMALLINT            AS iso_week,
    TO_CHAR(cr.collection_date, 'Day')                          AS day_of_week,

    -- Business
    b.id                                                        AS business_id,
    b.name                                                      AS business_name,
    b.short_code,
    b.category,
    b.sort_order,

    -- Amounts
    cr.credit_amount,
    cr.cash_amount,
    cr.deposit_amount,
    cr.total_cash_amount,
    cr.total_amount,

    -- Metadata
    cr.data_source,
    cr.notes,
    cr.created_by,
    cr.updated_by,
    cr.created_at,
    cr.updated_at

FROM  collection_records  cr
JOIN  businesses           b ON cr.business_id = b.id
WHERE b.is_active = TRUE;


-- ══════════════════════════════════════════════════════════════
--  6B. v_available_dates
--
--  Returns every distinct collection_date that has at least one
--  record, plus metadata useful for a calendar picker.
--  Used by the frontend to populate the date filter / calendar.
-- ══════════════════════════════════════════════════════════════

CREATE VIEW v_available_dates AS
SELECT
    collection_date,
    fiscal_year(collection_date)                AS fiscal_year,
    fiscal_quarter(collection_date)             AS fiscal_quarter,
    EXTRACT(MONTH FROM collection_date)::SMALLINT AS month_number,
    TO_CHAR(collection_date, 'Mon YYYY')        AS month_label,
    COUNT(DISTINCT business_id)                 AS sbu_count,
    SUM(total_amount)                           AS day_total,
    EXISTS (
        SELECT 1 FROM date_locks dl
        WHERE dl.collection_date = collection_records.collection_date
    )                                           AS is_locked
FROM  collection_records
GROUP BY collection_date
ORDER BY collection_date DESC;


-- ══════════════════════════════════════════════════════════════
--  6C. v_payment_mode_split_daily
--
--  Unpivots the three amount columns per date per business.
--  Filter by collection_date range in the application.
-- ══════════════════════════════════════════════════════════════

CREATE VIEW v_payment_mode_split_daily AS
    SELECT collection_date, business_id,
           'Credit'::payment_mode_type  AS payment_mode,
           credit_amount                AS amount
    FROM   collection_records
UNION ALL
    SELECT collection_date, business_id,
           'Cash'::payment_mode_type    AS payment_mode,
           cash_amount                  AS amount
    FROM   collection_records
UNION ALL
    SELECT collection_date, business_id,
           'Deposit'::payment_mode_type AS payment_mode,
           deposit_amount               AS amount
    FROM   collection_records;
```

---

## 7. RPC Aggregation Functions

These are called from the React frontend via `supabase.rpc('function_name', { params })`.
They replace the three views (`v_collection_summary`, `v_period_totals`, `v_top_movers`) that
required a `period_id` in v1. All SPLY comparison is computed automatically by shifting the
date range back one year.

```sql
-- ══════════════════════════════════════════════════════════════
--  7A. get_collection_summary(date_from, date_to)
--
--  Returns one row per active business with:
--    • Aggregated current-period amounts (SUM over the date range)
--    • Aggregated SPLY amounts (same range, one year prior)
--    • Absolute delta and growth percentage
--
--  Replaces: v_collection_summary (v1)
--  Called by: useCollectionSummary hook
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_collection_summary(
    p_date_from DATE,
    p_date_to   DATE
)
RETURNS TABLE (
    record_count      BIGINT,
    business_id       UUID,
    business_name     TEXT,
    short_code        TEXT,
    category          TEXT,
    sort_order        INT,
    -- Current period amounts
    credit_amount     NUMERIC,
    cash_amount       NUMERIC,
    deposit_amount    NUMERIC,
    total_cash_amount NUMERIC,
    total_amount      NUMERIC,
    -- SPLY amounts
    credit_sply       NUMERIC,
    cash_sply         NUMERIC,
    deposit_sply      NUMERIC,
    total_cash_sply   NUMERIC,
    total_sply        NUMERIC,
    -- Derived
    total_delta       NUMERIC,
    growth_pct        NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
    v_sply_from DATE;
    v_sply_to   DATE;
BEGIN
    SELECT s.sply_from, s.sply_to
    INTO   v_sply_from, v_sply_to
    FROM   sply_range(p_date_from, p_date_to) s;

    RETURN QUERY
    WITH current_agg AS (
        SELECT
            cr.business_id,
            COUNT(cr.id)                   AS record_count,
            SUM(cr.credit_amount)          AS credit,
            SUM(cr.cash_amount)            AS cash,
            SUM(cr.deposit_amount)         AS deposit,
            SUM(cr.total_cash_amount)      AS total_cash,
            SUM(cr.total_amount)           AS total
        FROM collection_records cr
        WHERE cr.collection_date BETWEEN p_date_from AND p_date_to
        GROUP BY cr.business_id
    ),
    sply_agg AS (
        SELECT
            cr.business_id,
            SUM(cr.credit_amount)          AS credit,
            SUM(cr.cash_amount)            AS cash,
            SUM(cr.deposit_amount)         AS deposit,
            SUM(cr.total_cash_amount)      AS total_cash,
            SUM(cr.total_amount)           AS total
        FROM collection_records cr
        WHERE cr.collection_date BETWEEN v_sply_from AND v_sply_to
        GROUP BY cr.business_id
    )
    SELECT
        COALESCE(c.record_count, 0)                             AS record_count,
        b.id                                                    AS business_id,
        b.name                                                  AS business_name,
        b.short_code,
        b.category,
        b.sort_order,
        -- Current
        COALESCE(c.credit,     0)                               AS credit_amount,
        COALESCE(c.cash,       0)                               AS cash_amount,
        COALESCE(c.deposit,    0)                               AS deposit_amount,
        COALESCE(c.total_cash, 0)                               AS total_cash_amount,
        COALESCE(c.total,      0)                               AS total_amount,
        -- SPLY
        s.credit                                                AS credit_sply,
        s.cash                                                  AS cash_sply,
        s.deposit                                               AS deposit_sply,
        s.total_cash                                            AS total_cash_sply,
        s.total                                                 AS total_sply,
        -- Delta
        COALESCE(c.total, 0) - COALESCE(s.total, 0)            AS total_delta,
        ROUND(
            ((COALESCE(c.total, 0) - COALESCE(s.total, 0))
             / NULLIF(s.total, 0)) * 100,
            2
        )                                                       AS growth_pct
    FROM businesses b
    LEFT JOIN current_agg c ON b.id = c.business_id
    LEFT JOIN sply_agg    s ON b.id = s.business_id
    WHERE b.is_active = TRUE
      AND (c.business_id IS NOT NULL OR s.business_id IS NOT NULL)
    ORDER BY COALESCE(c.total, 0) DESC;
END;
$$;


-- ══════════════════════════════════════════════════════════════
--  7B. get_period_totals(date_from, date_to)
--
--  Returns a single row of grand totals for the given date range
--  plus the corresponding SPLY totals and growth %, and metadata
--  about the fiscal period the range falls in.
--
--  Replaces: v_period_totals (v1)
--  Called by: usePeriodTotals hook
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_period_totals(
    p_date_from DATE,
    p_date_to   DATE
)
RETURNS TABLE (
    -- Range metadata
    date_from         DATE,
    date_to           DATE,
    fiscal_year_start SMALLINT,
    fiscal_year_end   SMALLINT,
    sply_from         DATE,
    sply_to           DATE,
    -- Current totals
    total_credit      NUMERIC,
    total_cash        NUMERIC,
    total_deposit     NUMERIC,
    total_cash_and_deposit NUMERIC,
    grand_total       NUMERIC,
    business_count    BIGINT,
    day_count         BIGINT,
    -- SPLY totals
    sply_credit       NUMERIC,
    sply_cash         NUMERIC,
    sply_deposit      NUMERIC,
    sply_grand_total  NUMERIC,
    sply_business_count BIGINT,
    -- Growth
    grand_total_delta NUMERIC,
    growth_pct        NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
    v_sply_from DATE;
    v_sply_to   DATE;
BEGIN
    SELECT s.sply_from, s.sply_to
    INTO   v_sply_from, v_sply_to
    FROM   sply_range(p_date_from, p_date_to) s;

    RETURN QUERY
    WITH current_totals AS (
        SELECT
            SUM(cr.credit_amount)          AS credit,
            SUM(cr.cash_amount)            AS cash,
            SUM(cr.deposit_amount)         AS deposit,
            SUM(cr.total_cash_amount)      AS total_cash_dep,
            SUM(cr.total_amount)           AS total,
            COUNT(DISTINCT cr.business_id) AS biz_count,
            COUNT(DISTINCT cr.collection_date) AS day_count
        FROM collection_records cr
        WHERE cr.collection_date BETWEEN p_date_from AND p_date_to
    ),
    sply_totals AS (
        SELECT
            SUM(cr.credit_amount)          AS credit,
            SUM(cr.cash_amount)            AS cash,
            SUM(cr.deposit_amount)         AS deposit,
            SUM(cr.total_amount)           AS total,
            COUNT(DISTINCT cr.business_id) AS biz_count
        FROM collection_records cr
        WHERE cr.collection_date BETWEEN v_sply_from AND v_sply_to
    )
    SELECT
        p_date_from,
        p_date_to,
        fiscal_year(p_date_from),
        fiscal_year(p_date_to),
        v_sply_from,
        v_sply_to,
        COALESCE(c.credit,        0),
        COALESCE(c.cash,          0),
        COALESCE(c.deposit,       0),
        COALESCE(c.total_cash_dep,0),
        COALESCE(c.total,         0),
        COALESCE(c.biz_count,     0),
        COALESCE(c.day_count,     0),
        COALESCE(s.credit,        0),
        COALESCE(s.cash,          0),
        COALESCE(s.deposit,       0),
        COALESCE(s.total,         0),
        COALESCE(s.biz_count,     0),
        COALESCE(c.total, 0) - COALESCE(s.total, 0),
        ROUND(
            ((COALESCE(c.total, 0) - COALESCE(s.total, 0))
             / NULLIF(s.total, 0)) * 100,
            2
        )
    FROM current_totals c, sply_totals s;
END;
$$;


-- ══════════════════════════════════════════════════════════════
--  7C. get_payment_mode_split(date_from, date_to)
--
--  Returns Credit / Cash / Deposit totals for the date range,
--  with percentage share of grand total.
--  Used by the payment mode donut / bar chart.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_payment_mode_split(
    p_date_from DATE,
    p_date_to   DATE
)
RETURNS TABLE (
    payment_mode  payment_mode_type,
    amount        NUMERIC,
    pct           NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH totals AS (
        SELECT
            SUM(credit_amount)  AS credit,
            SUM(cash_amount)    AS cash,
            SUM(deposit_amount) AS deposit,
            SUM(total_amount)   AS grand
        FROM collection_records
        WHERE collection_date BETWEEN p_date_from AND p_date_to
    )
    SELECT 'Credit'::payment_mode_type,  credit,  ROUND(credit  / NULLIF(grand,0) * 100, 2) FROM totals
    UNION ALL
    SELECT 'Cash'::payment_mode_type,    cash,    ROUND(cash    / NULLIF(grand,0) * 100, 2) FROM totals
    UNION ALL
    SELECT 'Deposit'::payment_mode_type, deposit, ROUND(deposit / NULLIF(grand,0) * 100, 2) FROM totals
    ORDER BY amount DESC;
END;
$$;


-- ══════════════════════════════════════════════════════════════
--  7D. get_monthly_trend(fiscal_year_current, fiscal_year_sply)
--
--  Returns one row per calendar month in fiscal order (Jul → Jun)
--  for the given current and SPLY fiscal years.
--  Used by the monthly trend line / area chart.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_monthly_trend(
    p_fy_current SMALLINT,
    p_fy_sply    SMALLINT DEFAULT NULL  -- defaults to p_fy_current - 1
)
RETURNS TABLE (
    month_number  SMALLINT,
    month_label   TEXT,
    fiscal_year   SMALLINT,
    current_total NUMERIC,
    sply_total    NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
    v_fy_sply     SMALLINT := COALESCE(p_fy_sply, p_fy_current - 1);
    v_curr_start  DATE     := fiscal_year_start(p_fy_current);
    v_curr_end    DATE     := (fiscal_year_start(p_fy_current + 1) - 1)::DATE;
    v_sply_start  DATE     := fiscal_year_start(v_fy_sply);
    v_sply_end    DATE     := (fiscal_year_start(v_fy_sply + 1) - 1)::DATE;
BEGIN
    RETURN QUERY
    WITH months AS (
        -- Generate all 12 fiscal months for the current FY
        SELECT
            generate_series(v_curr_start, v_curr_end, INTERVAL '1 month')::DATE AS month_start
    ),
    current_monthly AS (
        SELECT
            EXTRACT(MONTH FROM collection_date)::SMALLINT AS mnum,
            SUM(total_amount) AS total
        FROM collection_records
        WHERE collection_date BETWEEN v_curr_start AND v_curr_end
        GROUP BY mnum
    ),
    sply_monthly AS (
        SELECT
            EXTRACT(MONTH FROM collection_date)::SMALLINT AS mnum,
            SUM(total_amount) AS total
        FROM collection_records
        WHERE collection_date BETWEEN v_sply_start AND v_sply_end
        GROUP BY mnum
    )
    SELECT
        EXTRACT(MONTH FROM m.month_start)::SMALLINT         AS month_number,
        TO_CHAR(m.month_start, 'Mon')                       AS month_label,
        p_fy_current                                        AS fiscal_year,
        COALESCE(c.total, 0)                                AS current_total,
        COALESCE(s.total, 0)                                AS sply_total
    FROM months m
    LEFT JOIN current_monthly c ON c.mnum = EXTRACT(MONTH FROM m.month_start)
    LEFT JOIN sply_monthly    s ON s.mnum = EXTRACT(MONTH FROM m.month_start)
    ORDER BY m.month_start;
END;
$$;


-- ══════════════════════════════════════════════════════════════
--  7E. get_daily_trend(date_from, date_to)
--
--  Returns one row per calendar day in the range with grand
--  total across all SBUs. Used by the daily sparkline / bar chart.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_daily_trend(
    p_date_from DATE,
    p_date_to   DATE
)
RETURNS TABLE (
    collection_date  DATE,
    day_label        TEXT,
    total_credit     NUMERIC,
    total_cash       NUMERIC,
    total_deposit    NUMERIC,
    grand_total      NUMERIC,
    sbu_count        BIGINT,
    is_locked        BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        cr.collection_date,
        TO_CHAR(cr.collection_date, 'DD Mon')               AS day_label,
        SUM(cr.credit_amount)                               AS total_credit,
        SUM(cr.cash_amount)                                 AS total_cash,
        SUM(cr.deposit_amount)                              AS total_deposit,
        SUM(cr.total_amount)                                AS grand_total,
        COUNT(DISTINCT cr.business_id)                      AS sbu_count,
        EXISTS (
            SELECT 1 FROM date_locks dl
            WHERE dl.collection_date = cr.collection_date
        )                                                   AS is_locked
    FROM collection_records cr
    WHERE cr.collection_date BETWEEN p_date_from AND p_date_to
    GROUP BY cr.collection_date
    ORDER BY cr.collection_date;
END;
$$;


-- ══════════════════════════════════════════════════════════════
--  7F. get_top_movers(date_from, date_to, top_n)
--
--  Returns top N gainers and top N decliners by absolute delta
--  vs the SPLY window. top_n defaults to 10.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_top_movers(
    p_date_from DATE,
    p_date_to   DATE,
    p_top_n     INT DEFAULT 10
)
RETURNS TABLE (
    business_id    UUID,
    business_name  TEXT,
    category       TEXT,
    total_amount   NUMERIC,
    total_sply     NUMERIC,
    total_delta    NUMERIC,
    growth_pct     NUMERIC,
    direction      TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH summary AS (
        SELECT * FROM get_collection_summary(p_date_from, p_date_to)
    ),
    ranked AS (
        SELECT
            s.business_id,
            s.business_name,
            s.category,
            s.total_amount,
            s.total_sply,
            s.total_delta,
            s.growth_pct,
            CASE
                WHEN s.total_delta > 0 THEN 'gainer'
                WHEN s.total_delta < 0 THEN 'decliner'
                ELSE 'neutral'
            END AS direction,
            ROW_NUMBER() OVER (
                PARTITION BY CASE WHEN s.total_delta > 0 THEN 'gainer' ELSE 'decliner' END
                ORDER BY ABS(s.total_delta) DESC
            ) AS rn
        FROM summary s
        WHERE s.total_sply IS NOT NULL   -- only SBUs with SPLY data
    )
    SELECT r.business_id, r.business_name, r.category,
           r.total_amount, r.total_sply, r.total_delta,
           r.growth_pct, r.direction
    FROM ranked r
    WHERE r.direction IN ('gainer', 'decliner')
      AND r.rn <= p_top_n
    ORDER BY r.direction, ABS(r.total_delta) DESC;
END;
$$;
```

---

## 8. Row-Level Security

```sql
-- ══════════════════════════════════════════════════════════════
--  8. ROW-LEVEL SECURITY (RLS)
--
--  Role hierarchy:
--    viewer  → SELECT only
--    editor  → SELECT + INSERT/UPDATE on unlocked dates
--    admin   → full access including DELETE and date locking
-- ══════════════════════════════════════════════════════════════

ALTER TABLE businesses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_locks          ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- businesses policies
-- ────────────────────────────────────────────────────────────

CREATE POLICY "Authenticated users can read businesses"
ON businesses FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert businesses"
ON businesses FOR INSERT
WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update businesses"
ON businesses FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete businesses"
ON businesses FOR DELETE
USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ────────────────────────────────────────────────────────────
-- collection_records policies
--
-- The critical change vs v1: lock check now queries date_locks
-- instead of checking collection_periods.is_locked.
-- ────────────────────────────────────────────────────────────

CREATE POLICY "Authenticated users can read collection records"
ON collection_records FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Editors and admins can insert into unlocked dates"
ON collection_records FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
    AND NOT EXISTS (
        SELECT 1 FROM date_locks
        WHERE collection_date = NEW.collection_date
    )
);

CREATE POLICY "Editors and admins can update unlocked dates"
ON collection_records FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
    AND NOT EXISTS (
        SELECT 1 FROM date_locks
        WHERE collection_date = OLD.collection_date
    )
);

CREATE POLICY "Admins can delete collection records"
ON collection_records FOR DELETE
USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ────────────────────────────────────────────────────────────
-- user_profiles policies  (unchanged from v1)
-- ────────────────────────────────────────────────────────────

CREATE POLICY "Users can read own profile"
ON user_profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Admins can read all profiles"
ON user_profiles FOR SELECT
USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Admins can update any profile"
ON user_profiles FOR UPDATE
USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ────────────────────────────────────────────────────────────
-- import_logs policies  (unchanged from v1)
-- ────────────────────────────────────────────────────────────

CREATE POLICY "Editors and admins can read import logs"
ON import_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
);

CREATE POLICY "Editors and admins can insert import logs"
ON import_logs FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'editor')
    )
);

-- import_logs are append-only: no UPDATE or DELETE policies.


-- ────────────────────────────────────────────────────────────
-- date_locks policies
-- ────────────────────────────────────────────────────────────

CREATE POLICY "Authenticated users can read date locks"
ON date_locks FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert date locks"
ON date_locks FOR INSERT
WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete date locks"
ON date_locks FOR DELETE
USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
```

---

## 9. Seed Data [Optional - Will seed database via front-end]

> **Note on snapshot imports:** The 55-SBU data below represents a 9-month cumulative figure
> (Jul 2024 – Mar 2025). Since we no longer have period rows, we load the data with
> `collection_date = '2025-03-31'` (the period end date). A dashboard query of
> `date_from = '2024-07-01'`, `date_to = '2025-03-31'` returns the correct aggregate.
> Going forward, daily CSV uploads each use that day's actual date.

```sql
-- ══════════════════════════════════════════════════════════════
--  9A. SEED: BUSINESSES (55 SBUs)
-- ══════════════════════════════════════════════════════════════

INSERT INTO businesses (name, category, sort_order) VALUES
    -- Agri & Animal
    ('ACI Animal Genetics',              'Animal Health',   1),
    ('Animal Health',                    'Animal Health',   2),
    ('Fertilizer',                       'Agri',            3),
    ('Field Crops',                      'Agri',            4),
    ('Harvester',                        'Agri',            5),
    ('Power Tiller',                     'Agri',            6),
    ('Spare - Tractor',                  'Agri',            7),
    ('Vegetables',                       'Agri',            8),

    -- FMCG & Food
    ('ACI Edible Oils Limited',          'FMCG',            9),
    ('ACI Foods Limited',                'FMCG',           10),
    ('ACI Foods Limited (Rice Unit)',    'FMCG',           11),
    ('ACI Pure Flour Limited',           'FMCG',           12),
    ('ACI Salt Limited',                 'FMCG',           13),
    ('Beverage',                         'FMCG',           14),
    ('Flora',                            'FMCG',           15),

    -- Consumer & Hygiene
    ('ACI Consumer Electronics',         'Consumer',       16),
    ('Consumer',                         'Consumer',       17),
    ('Hygiene',                          'Consumer',       18),
    ('Paint',                            'Consumer',       19),

    -- Pharmaceuticals
    ('Pharmaceuticals',                  'Pharma',         20),
    ('ACI Formulations',                 'Pharma',         21),
    ('Ndds',                             'Pharma',         22),

    -- Motors & Vehicles
    ('ACI Motors Limited',               'Motors',         23),
    ('ACI Motors Service income',        'Motors',         24),
    ('CEAT Tyre',                        'Motors',         25),
    ('FOTON',                            'Motors',         26),
    ('Liqui Moly',                       'Motors',         27),
    ('Lube Oil',                         'Motors',         28),
    ('Mahindra',                         'Motors',         29),
    ('Tire',                             'Motors',         30),
    ('Yamaha Motorcycles',               'Motors',         31),
    ('Yamaha Spare Parts',               'Motors',         32),
    ('Yamaha Apparels',                  'Motors',         33),
    ('Yamaha Music',                     'Consumer',       34),

    -- Industrial & Machinery
    ('ACI Premio Plastics',              'Industrial',     35),
    ('ACI Water Pump',                   'Industrial',     36),
    ('Construction Equipment',           'Industrial',     37),
    ('Diesel Engine',                    'Industrial',     38),
    ('Diesel Generator & Spares',        'Industrial',     39),
    ('Electrical',                       'Industrial',     40),
    ('Lab Equipment & Accessories',      'Industrial',     41),
    ('New Machineries',                  'Industrial',     42),
    ('Power Cable Accessories',          'Industrial',     43),
    ('Power Products',                   'Industrial',     44),
    ('Premiaflex',                       'Industrial',     45),
    ('Spare - Construction Equipment',   'Industrial',     46),
    ('Spare - New Machineries',          'Industrial',     47),
    ('Spare Parts',                      'Industrial',     48),
    ('Tools and Accessories',            'Industrial',     49),

    -- Marine
    ('ACI Marine',                       'Marine',         50),
    ('ACI Marine - Spare Parts',         'Marine',         51),

    -- Energy
    ('ACI Renewable Energy',             'Energy',         52),

    -- Healthcare
    ('HealthCare Equipment',             'Healthcare',     53),

    -- Education
    ('Edulink',                          'Education',      54),

    -- Sales
    ('Institutional Sales',              'Sales',          55);


-- ══════════════════════════════════════════════════════════════
--  9B. SEED: COLLECTION RECORDS
--
--  Two batches:
--    • collection_date = '2024-03-31'  → represents 9M FY2024
--      (Jul 2023 – Mar 2024), stored as the SPLY snapshot
--    • collection_date = '2025-03-31'  → represents 9M FY2025
--      (Jul 2024 – Mar 2025), stored as the current snapshot
--
--  Dashboard queries:
--    9M FY2025: date_from='2024-07-01', date_to='2025-03-31'
--    9M FY2024: date_from='2023-07-01', date_to='2024-03-31'
--    SPLY auto-computed: each range shifts back 1 year.
-- ══════════════════════════════════════════════════════════════

-- ── Snapshot: 9M FY2024 (SPLY baseline) ─────────────────────

INSERT INTO collection_records (business_id, collection_date, credit_amount, cash_amount, deposit_amount, data_source)
SELECT b.id, '2024-03-31'::DATE, s.credit, s.cash, s.deposit, 'csv_import'
FROM (VALUES
    ('ACI Animal Genetics',            0,           40.689292,    0          ),
    ('ACI Consumer Electronics',       0.317202,    0.352668,     0          ),
    ('ACI Edible Oils Limited',        52.625736,   0,            85.585931  ),
    ('ACI Foods Limited',              351.669973,  0,            308.471378 ),
    ('ACI Foods Limited (Rice Unit)',  194.080936,  0,            225.39857  ),
    ('ACI Formulations',               280.813033,  24.716876,    0          ),
    ('ACI Marine',                     0,           1.125,        0          ),
    ('ACI Marine - Spare Parts',       0,           0.485864,     0          ),
    ('ACI Motors Limited',             167.563387,  2.78,         0          ),
    ('ACI Motors Service income',      0,           2.78395,      0          ),
    ('ACI Premio Plastics',            79.686502,   0,            217.146877 ),
    ('ACI Pure Flour Limited',         103.773194,  0,            315.788405 ),
    ('ACI Renewable Energy',           0,           0,            0          ),
    ('ACI Salt Limited',               52.668061,   0,            266.923455 ),
    ('ACI Water Pump',                 24.206894,   111.277705,   16.842826  ),
    ('Animal Health',                  239.896966,  306.82082,    0          ),
    ('Beverage',                       0,           0,            0          ),
    ('CEAT Tyre',                      103.525882,  16.662024,    0          ),
    ('Construction Equipment',         58.99775,    1,            0          ),
    ('Consumer',                       75.619798,   16.588193,    512.075699 ),
    ('Diesel Engine',                  11.200193,   5.679275,     0.10125    ),
    ('Diesel Generator & Spares',      57.841453,   9.866597,     0          ),
    ('Edulink',                        0,           0,            0          ),
    ('Electrical',                     47.015186,   0.393451,     23.181961  ),
    ('Fertilizer',                     98.763589,   47.21896,     0          ),
    ('Field Crops',                    93.103938,   99.047645,    0          ),
    ('Flora',                          42.017127,   0,            0          ),
    ('FOTON',                          107.652104,  4.654011,     0          ),
    ('Harvester',                      27.722709,   0,            0          ),
    ('HealthCare Equipment',           0,           2.69869,      0          ),
    ('Hygiene',                        9.331364,    0.00175,      263.667999 ),
    ('Institutional Sales',            1.339297,    0,            0          ),
    ('Lab Equipment & Accessories',    0,           0,            0          ),
    ('Liqui Moly',                     0,           3.811921,     0          ),
    ('Lube Oil',                       0,           0,            0          ),
    ('Mahindra',                       0,           0,            0          ),
    ('Ndds',                           0.859457,    1.123,        0          ),
    ('New Machineries',                1.422319,    0.55,         0          ),
    ('Paint',                          44.197468,   16.370392,    0.02       ),
    ('Pharmaceuticals',                357.011575,  1319.143528,  0          ),
    ('Power Cable Accessories',        0.561985,    0.011,        0          ),
    ('Power Products',                 0.501,       1.47935,      0          ),
    ('Power Tiller',                   14.18832,    4.661381,     0          ),
    ('Premiaflex',                     690.652531,  0,            14.338892  ),
    ('Spare - Construction Equipment', 1.884314,    3.086143,     0          ),
    ('Spare - New Machineries',        17.662793,   18.395604,    0          ),
    ('Spare - Tractor',                24.728634,   16.468107,    0          ),
    ('Spare Parts',                    6.647099,    2.385027,     0          ),
    ('Tire',                           0.434787,    0,            0          ),
    ('Tools and Accessories',          1.068307,    13.951236,    0          ),
    ('Vegetables',                     18.867676,   10.287267,    0          ),
    ('Yamaha Apparels',                0,           0,            0          ),
    ('Yamaha Motorcycles',             137.012448,  1808.600741,  493.2209   ),
    ('Yamaha Music',                   1.2135,      1.513499,     0.0032     ),
    ('Yamaha Spare Parts',             0,           126.86567,    0          )
) AS s(business_name, credit, cash, deposit)
JOIN businesses b ON b.name = s.business_name;


-- ── Snapshot: 9M FY2025 (current period) ────────────────────

INSERT INTO collection_records (business_id, collection_date, credit_amount, cash_amount, deposit_amount, data_source)
SELECT b.id, '2025-03-31'::DATE, s.credit, s.cash, s.deposit, 'csv_import'
FROM (VALUES
    ('ACI Animal Genetics',            0,           39.425877,    0          ),
    ('ACI Consumer Electronics',       0,           0.1162,       0          ),
    ('ACI Edible Oils Limited',        21.436444,   0,            160.099337 ),
    ('ACI Foods Limited',              127.088312,  0,            315.751015 ),
    ('ACI Foods Limited (Rice Unit)',  203.741774,  0.075,        296.97946  ),
    ('ACI Formulations',               309.848125,  19.855026,    0          ),
    ('ACI Marine',                     1.5,         0.863223,     0          ),
    ('ACI Marine - Spare Parts',       0,           1.21814,      0          ),
    ('ACI Motors Limited',             191.53075,   6.501818,     0          ),
    ('ACI Motors Service income',      0,           3.00495,      0          ),
    ('ACI Premio Plastics',            84.38231,    0,            243.340232 ),
    ('ACI Pure Flour Limited',         100.311339,  0,            401.135219 ),
    ('ACI Renewable Energy',           6.887357,    14.729857,    0          ),
    ('ACI Salt Limited',               58.000636,   0,            192.401287 ),
    ('ACI Water Pump',                 55.587797,   110.956881,   6.528887   ),
    ('Animal Health',                  261.639362,  325.58814,    0          ),
    ('Beverage',                       1.633368,    0,            11.881782  ),
    ('CEAT Tyre',                      152.33298,   21.519524,    0          ),
    ('Construction Equipment',         36.028918,   2,            0          ),
    ('Consumer',                       100.174588,  9.648509,     481.81455  ),
    ('Diesel Engine',                  12.849039,   7.3823,       0.25       ),
    ('Diesel Generator & Spares',      101.365411,  4.650489,     0          ),
    ('Edulink',                        0.819271,    0,            13.199041  ),
    ('Electrical',                     32.240892,   0.285182,     30.250497  ),
    ('Fertilizer',                     80.395228,   65.151357,    0          ),
    ('Field Crops',                    42.977997,   58.726781,    0          ),
    ('Flora',                          33.388656,   0,            0          ),
    ('FOTON',                          141.62584,   21.678634,    0          ),
    ('Harvester',                      79.480707,   0,            0          ),
    ('HealthCare Equipment',           0,           2.718712,     0          ),
    ('Hygiene',                        6.154769,    0.080467,     363.423789 ),
    ('Institutional Sales',            0,           0,            0          ),
    ('Lab Equipment & Accessories',    0.553584,    0,            0          ),
    ('Liqui Moly',                     0,           19.936813,    0          ),
    ('Lube Oil',                       0,           0.59987,      0          ),
    ('Mahindra',                       4.185945,    0,            0          ),
    ('Ndds',                           2.37875,     0.921,        0          ),
    ('New Machineries',                1.086133,    0.18,         0          ),
    ('Paint',                          50.912541,   12.975942,    0.37863    ),
    ('Pharmaceuticals',                886.826097,  1219.64351,   0          ),
    ('Power Cable Accessories',        1.914819,    0.275546,     0          ),
    ('Power Products',                 0.885681,    4.8461,       0          ),
    ('Power Tiller',                   18.940437,   5.335717,     0          ),
    ('Premiaflex',                     680.864542,  0,            9.679155   ),
    ('Spare - Construction Equipment', 1.807223,    3.070347,     0          ),
    ('Spare - New Machineries',        0,           0,            0          ),
    ('Spare - Tractor',                73.291442,   19.216507,    0          ),
    ('Spare Parts',                    5.999611,    0.43898,      0          ),
    ('Tire',                           0.13,        0,            0          ),
    ('Tools and Accessories',          1.82764,     13.232944,    0          ),
    ('Vegetables',                     21.50699,    12.158865,    0          ),
    ('Yamaha Apparels',                0,           0.00991,      0          ),
    ('Yamaha Motorcycles',             243.126187,  2087.600356,  556.584275 ),
    ('Yamaha Music',                   0,           3.27075,      0          ),
    ('Yamaha Spare Parts',             0.000001,    169.687339,   0          )
) AS s(business_name, credit, cash, deposit)
JOIN businesses b ON b.name = s.business_name;
```

---

## 10. Filter Presets Reference (Frontend)

All date range computation happens in TypeScript/JavaScript. The frontend passes the resolved
`date_from` and `date_to` strings to the hooks / RPC functions.

ACI's fiscal year: **July 1 → June 30**.

```typescript
// /src/lib/datePresets.ts
// ─────────────────────────────────────────────────────────────
// Computes date_from / date_to pairs for each dashboard preset.
// All dates returned as 'YYYY-MM-DD' strings (Supabase-safe).
// ─────────────────────────────────────────────────────────────

const toISO = (d: Date) => d.toISOString().slice(0, 10);

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** ACI fiscal year that contains the given date (Jul–Jun). */
function fiscalYear(d: Date): number {
  return d.getMonth() >= 6 ? d.getFullYear() + 1 : d.getFullYear();
}

/** First day of the fiscal year containing d. */
function fyStart(d: Date): Date {
  const fy = fiscalYear(d);
  return new Date(fy - 1, 6, 1);  // July 1
}

/** First day of the fiscal quarter containing d.
 *  Q1=Jul–Sep | Q2=Oct–Dec | Q3=Jan–Mar | Q4=Apr–Jun */
function fqStart(d: Date): Date {
  const m = d.getMonth();
  if (m >= 6 && m <= 8)  return new Date(d.getFullYear(), 6, 1);   // Jul
  if (m >= 9 && m <= 11) return new Date(d.getFullYear(), 9, 1);   // Oct
  if (m >= 0 && m <= 2)  return new Date(d.getFullYear(), 0, 1);   // Jan
  return new Date(d.getFullYear(), 3, 1);                           // Apr
}

/** First day of the ISO week (Monday) containing d. */
function weekStart(d: Date): Date {
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday;
}

/** Shift a date back exactly 1 year (handles leap years). */
function minusOneYear(d: Date): Date {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() - 1);
  return r;
}

export type DateRange = { dateFrom: string; dateTo: string };

export type PresetKey =
  | 'today' | 'yesterday'
  | 'wtd' | 'mtd' | 'qtd' | 'ytd'
  | 'last7' | 'last30' | 'last90'
  | 'custom';

export function getPresetRange(preset: PresetKey, customFrom?: string, customTo?: string): DateRange {
  const t = today();

  switch (preset) {

    case 'today':
      return { dateFrom: toISO(t), dateTo: toISO(t) };

    case 'yesterday': {
      const y = new Date(t);
      y.setDate(t.getDate() - 1);
      return { dateFrom: toISO(y), dateTo: toISO(y) };
    }

    case 'wtd':
      return { dateFrom: toISO(weekStart(t)), dateTo: toISO(t) };

    case 'mtd': {
      const mStart = new Date(t.getFullYear(), t.getMonth(), 1);
      return { dateFrom: toISO(mStart), dateTo: toISO(t) };
    }

    case 'qtd':
      return { dateFrom: toISO(fqStart(t)), dateTo: toISO(t) };

    case 'ytd':
      return { dateFrom: toISO(fyStart(t)), dateTo: toISO(t) };

    case 'last7': {
      const f = new Date(t);
      f.setDate(t.getDate() - 6);
      return { dateFrom: toISO(f), dateTo: toISO(t) };
    }

    case 'last30': {
      const f = new Date(t);
      f.setDate(t.getDate() - 29);
      return { dateFrom: toISO(f), dateTo: toISO(t) };
    }

    case 'last90': {
      const f = new Date(t);
      f.setDate(t.getDate() - 89);
      return { dateFrom: toISO(f), dateTo: toISO(t) };
    }

    case 'custom':
      return {
        dateFrom: customFrom ?? toISO(fyStart(t)),
        dateTo:   customTo   ?? toISO(t),
      };

    default:
      return { dateFrom: toISO(fyStart(t)), dateTo: toISO(t) };
  }
}

/** Derive SPLY range from any DateRange (shifts back exactly 1 year). */
export function getSplyRange(range: DateRange): DateRange {
  const from = new Date(range.dateFrom);
  const to   = new Date(range.dateTo);
  return {
    dateFrom: toISO(minusOneYear(from)),
    dateTo:   toISO(minusOneYear(to)),
  };
}

/** Human-readable label for a DateRange. */
export function formatRangeLabel(range: DateRange): string {
  if (range.dateFrom === range.dateTo) {
    return new Date(range.dateFrom).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
  const f = new Date(range.dateFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const t = new Date(range.dateTo  ).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${f} – ${t}`;
}
```

### Preset Quick-Reference

| Preset | `date_from` | `date_to` | Notes |
|---|---|---|---|
| **Today** | today | today | Single-day view |
| **Yesterday** | today − 1 | today − 1 | |
| **WTD** | Mon of current ISO week | today | Week starts Monday |
| **MTD** | 1st of current month | today | Calendar month |
| **QTD** | 1st of current fiscal quarter | today | Jul/Oct/Jan/Apr |
| **YTD** | Jul 1 of current fiscal year | today | ACI fiscal year |
| **Last 7 days** | today − 6 | today | Rolling window |
| **Last 30 days** | today − 29 | today | Rolling window |
| **Last 90 days** | today − 89 | today | Rolling window |
| **Custom** | user-selected | user-selected | Date picker |

---

## 11. Common Application Queries

These are the queries the React frontend calls most frequently, via Supabase RPC or PostgREST.

```sql
-- ──────────────────────────────────────────────────────────────
--  Q1. Dashboard KPI cards — grand totals + SPLY for a date range
--      (replace the date strings with your actual range)
-- ──────────────────────────────────────────────────────────────

SELECT * FROM get_period_totals('2024-07-01', '2025-03-31');
-- Returns: grand_total, total_credit, total_cash, total_deposit,
--          sply_grand_total, growth_pct, date_from, date_to, sply_from, sply_to


-- ──────────────────────────────────────────────────────────────
--  Q2. Full collection table — all SBUs with current + SPLY
-- ──────────────────────────────────────────────────────────────

SELECT * FROM get_collection_summary('2024-07-01', '2025-03-31')
ORDER BY total_amount DESC;


-- ──────────────────────────────────────────────────────────────
--  Q3. Payment mode split for donut chart
-- ──────────────────────────────────────────────────────────────

SELECT * FROM get_payment_mode_split('2024-07-01', '2025-03-31');
-- Returns: Credit | Cash | Deposit with amount and pct


-- ──────────────────────────────────────────────────────────────
--  Q4. Top 5 gainers and top 5 decliners
-- ──────────────────────────────────────────────────────────────

SELECT * FROM get_top_movers('2024-07-01', '2025-03-31', 5)
ORDER BY direction, ABS(total_delta) DESC;


-- ──────────────────────────────────────────────────────────────
--  Q5. Monthly trend chart for FY2025 vs FY2024
-- ──────────────────────────────────────────────────────────────

SELECT * FROM get_monthly_trend(2025);
-- Returns 12 rows (Jul → Jun) with current_total and sply_total


-- ──────────────────────────────────────────────────────────────
--  Q6. Daily trend for current month (bar/sparkline chart)
-- ──────────────────────────────────────────────────────────────

SELECT * FROM get_daily_trend('2025-03-01', '2025-03-31');
-- Returns one row per day with per-mode totals and is_locked flag


-- ──────────────────────────────────────────────────────────────
--  Q7. Available dates for the calendar picker
-- ──────────────────────────────────────────────────────────────

SELECT collection_date, sbu_count, day_total, is_locked
FROM v_available_dates
ORDER BY collection_date DESC
LIMIT 90;


-- ──────────────────────────────────────────────────────────────
--  Q8. Single-day drill-down (all SBUs for one date)
-- ──────────────────────────────────────────────────────────────

SELECT *
FROM v_daily_collection
WHERE collection_date = '2025-03-31'
ORDER BY total_amount DESC;


-- ──────────────────────────────────────────────────────────────
--  Q9. Single SBU history — all dates for one business
-- ──────────────────────────────────────────────────────────────

SELECT collection_date, fiscal_year, fiscal_quarter, month_number,
       credit_amount, cash_amount, deposit_amount, total_amount
FROM v_daily_collection
WHERE business_id = '<TARGET_BUSINESS_UUID>'
ORDER BY collection_date;


-- ──────────────────────────────────────────────────────────────
--  Q10. Upsert a single collection record (manual entry / inline editor)
-- ──────────────────────────────────────────────────────────────

INSERT INTO collection_records
    (business_id, collection_date, credit_amount, cash_amount, deposit_amount, updated_by, data_source)
VALUES
    ('<BUSINESS_UUID>', '2025-04-15', 0, 0, 0, '<USER_UUID>', 'manual')
ON CONFLICT (business_id, collection_date)
DO UPDATE SET
    credit_amount  = EXCLUDED.credit_amount,
    cash_amount    = EXCLUDED.cash_amount,
    deposit_amount = EXCLUDED.deposit_amount,
    updated_by     = EXCLUDED.updated_by,
    data_source    = EXCLUDED.data_source;
    -- updated_at is handled automatically by the trigger


-- ──────────────────────────────────────────────────────────────
--  Q11. Lock a date or range (admin only — use RPC helper)
-- ──────────────────────────────────────────────────────────────

SELECT lock_date_range('2025-03-01', '2025-03-31', 'Month-end close');
-- Returns the number of dates newly locked

SELECT unlock_date_range('2025-03-31', '2025-03-31');
-- Returns the number of dates unlocked


-- ──────────────────────────────────────────────────────────────
--  Q12. Check which dates are already locked
-- ──────────────────────────────────────────────────────────────

SELECT collection_date, locked_by, locked_at, notes
FROM date_locks
ORDER BY collection_date DESC;


-- ──────────────────────────────────────────────────────────────
--  Q13. Check for existing records before a CSV import
--       (returns business names that already have data on a date)
-- ──────────────────────────────────────────────────────────────

SELECT b.name
FROM   collection_records cr
JOIN   businesses          b ON cr.business_id = b.id
WHERE  cr.collection_date = '2025-04-15';


-- ──────────────────────────────────────────────────────────────
--  Q14. Change a user's role (admin only)
-- ──────────────────────────────────────────────────────────────

UPDATE user_profiles
SET    role = 'editor'   -- 'admin' | 'editor' | 'viewer'
WHERE  id   = '<USER_UUID>';


-- ──────────────────────────────────────────────────────────────
--  Q15. Arbitrary date-range comparison (any two ranges side by side)
-- ──────────────────────────────────────────────────────────────

WITH
  range_a AS (SELECT * FROM get_collection_summary('2024-07-01', '2024-12-31')),
  range_b AS (SELECT * FROM get_collection_summary('2025-01-01', '2025-03-31'))
SELECT
    a.business_name,
    a.category,
    a.total_amount          AS h1_total,
    b.total_amount          AS h2_total,
    b.total_amount - a.total_amount AS delta,
    ROUND(((b.total_amount - a.total_amount) / NULLIF(a.total_amount, 0)) * 100, 2) AS growth_pct
FROM range_a a
JOIN range_b b USING (business_id)
ORDER BY delta DESC;
```

---

## 12. Supabase Integration — Setup

### 12.1 Install the Supabase JS Client

```bash
pnpm add @supabase/supabase-js
```

### 12.2 Environment Variables (`/.env.local`)

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 12.3 Supabase Client Singleton (`/src/lib/supabaseClient.ts`)

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### 12.4 TypeScript Types (`/src/lib/database.types.ts`)

```ts
// /src/lib/database.types.ts
// Auto-generate with: npx supabase gen types typescript --project-id <YOUR_PROJECT_ID>

export type PaymentModeType = 'Credit' | 'Cash' | 'Deposit';
export type DataSource      = 'manual' | 'csv_import' | 'api';
export type UserRole        = 'admin' | 'editor' | 'viewer';

// ── Table row shapes ───────────────────────────────────────────────────────────

export interface Business {
  id:         string;
  name:       string;
  short_code: string | null;
  category:   string | null;
  parent_id:  string | null;
  is_active:  boolean;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionRecord {
  id:                string;
  business_id:       string;
  collection_date:   string;      // 'YYYY-MM-DD'
  credit_amount:     number;
  cash_amount:       number;
  deposit_amount:    number;
  total_cash_amount: number;      // generated column
  total_amount:      number;      // generated column
  data_source:       DataSource;
  notes:             string | null;
  created_by:        string | null;
  updated_by:        string | null;
  created_at:        string;
  updated_at:        string;
}

export interface UserProfile {
  id:         string;
  full_name:  string | null;
  role:       UserRole;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportLog {
  id:               string;
  imported_by:      string | null;
  collection_date:  string | null;  // 'YYYY-MM-DD'
  file_name:        string | null;
  row_count:        number | null;
  status:           'success' | 'partial' | 'failed' | null;
  error_details:    unknown;
  skipped_businesses: string[] | null;
  imported_at:      string;
}

export interface DateLock {
  collection_date: string;        // 'YYYY-MM-DD'
  locked_by:       string | null;
  locked_at:       string;
  notes:           string | null;
}

// ── View row shapes ────────────────────────────────────────────────────────────

/** Row from v_daily_collection — one record per business per date. */
export interface VDailyCollectionRow {
  record_id:         string;
  collection_date:   string;
  fiscal_year:       number;
  fiscal_quarter:    number;
  month_number:      number;
  year_month:        string;
  iso_week:          number;
  day_of_week:       string;
  business_id:       string;
  business_name:     string;
  short_code:        string | null;
  category:          string | null;
  sort_order:        number | null;
  credit_amount:     number;
  cash_amount:       number;
  deposit_amount:    number;
  total_cash_amount: number;
  total_amount:      number;
  data_source:       DataSource;
  notes:             string | null;
  created_at:        string;
  updated_at:        string;
}

/** Row from v_available_dates — one row per collection_date. */
export interface VAvailableDateRow {
  collection_date: string;
  fiscal_year:     number;
  fiscal_quarter:  number;
  month_number:    number;
  month_label:     string;
  sbu_count:       number;
  day_total:       number;
  is_locked:       boolean;
}

// ── RPC return shapes ──────────────────────────────────────────────────────────

/** Returned by get_collection_summary(date_from, date_to) — one row per SBU. */
export interface CollectionSummaryRow {
  record_count:      number;
  business_id:       string;
  business_name:     string;
  short_code:        string | null;
  category:          string | null;
  sort_order:        number | null;
  credit_amount:     number;
  cash_amount:       number;
  deposit_amount:    number;
  total_cash_amount: number;
  total_amount:      number;
  credit_sply:       number | null;
  cash_sply:         number | null;
  deposit_sply:      number | null;
  total_cash_sply:   number | null;
  total_sply:        number | null;
  total_delta:       number | null;
  growth_pct:        number | null;
}

/** Returned by get_period_totals(date_from, date_to) — single row. */
export interface PeriodTotalsRow {
  date_from:              string;
  date_to:                string;
  fiscal_year_start:      number;
  fiscal_year_end:        number;
  sply_from:              string;
  sply_to:                string;
  total_credit:           number;
  total_cash:             number;
  total_deposit:          number;
  total_cash_and_deposit: number;
  grand_total:            number;
  business_count:         number;
  day_count:              number;
  sply_credit:            number;
  sply_cash:              number;
  sply_deposit:           number;
  sply_grand_total:       number;
  sply_business_count:    number;
  grand_total_delta:      number;
  growth_pct:             number | null;
}

/** Returned by get_payment_mode_split(date_from, date_to) — 3 rows. */
export interface PaymentModeSplitRow {
  payment_mode: PaymentModeType;
  amount:       number;
  pct:          number | null;
}

/** Returned by get_monthly_trend(fy_current, fy_sply) — 12 rows. */
export interface MonthlyTrendRow {
  month_number:  number;
  month_label:   string;
  fiscal_year:   number;
  current_total: number;
  sply_total:    number;
}

/** Returned by get_daily_trend(date_from, date_to) — one row per day. */
export interface DailyTrendRow {
  collection_date: string;
  day_label:       string;
  total_credit:    number;
  total_cash:      number;
  total_deposit:   number;
  grand_total:     number;
  sbu_count:       number;
  is_locked:       boolean;
}

/** Returned by get_top_movers(date_from, date_to, top_n). */
export interface TopMoverRow {
  business_id:   string;
  business_name: string;
  category:      string | null;
  total_amount:  number;
  total_sply:    number | null;
  total_delta:   number | null;
  growth_pct:    number | null;
  direction:     'gainer' | 'decliner' | 'neutral';
}
```

---

## 13. React Hook Library

All hooks live in `/src/hooks/`. Each accepts a `DateRange` object (or its constituent strings) and
returns `{ data, loading, error }`.

### 13.1 `useDateFilter` — Global Filter Context

This replaces `PeriodContext.tsx`. Instead of a UUID, the active context is a `DateRange` + a
`PresetKey`. All other hooks subscribe to this context.

```ts
// /src/context/DateFilterContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';
import { getPresetRange, type PresetKey, type DateRange } from '../lib/datePresets';

interface DateFilterContextValue {
  preset:      PresetKey;
  dateRange:   DateRange;
  setPreset:   (p: PresetKey) => void;
  setCustomRange: (from: string, to: string) => void;
}

const DateFilterContext = createContext<DateFilterContextValue | null>(null);

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<PresetKey>('ytd');
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('ytd'));

  function setPreset(p: PresetKey) {
    setPresetState(p);
    if (p !== 'custom') setDateRange(getPresetRange(p));
  }

  function setCustomRange(from: string, to: string) {
    setPresetState('custom');
    setDateRange({ dateFrom: from, dateTo: to });
  }

  return (
    <DateFilterContext.Provider value={{ preset, dateRange, setPreset, setCustomRange }}>
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const ctx = useContext(DateFilterContext);
  if (!ctx) throw new Error('useDateFilter must be used inside <DateFilterProvider>');
  return ctx;
}
```

Register in `/src/main.tsx`: wrap `<App />` with `<DateFilterProvider>`.

---

### 13.2 `useCollectionSummary` — Collection Table & Top 10

```ts
// /src/hooks/useCollectionSummary.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { CollectionSummaryRow } from '../lib/database.types';

export interface CollectionSummaryResult {
  rows:    CollectionSummaryRow[];
  top10:   CollectionSummaryRow[];
  loading: boolean;
  error:   string | null;
}

export function useCollectionSummary(dateFrom: string | null, dateTo: string | null): CollectionSummaryResult {
  const [rows,    setRows]    = useState<CollectionSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setRows([]);

    async function fetchData() {
      const { data, error: rpcErr } = await supabase
        .rpc('get_collection_summary', { p_date_from: dateFrom, p_date_to: dateTo });

      if (!cancelled) {
        if (rpcErr) setError(rpcErr.message);
        else        setRows((data ?? []) as CollectionSummaryRow[]);
        setLoading(false);
      }
    }

    fetchData();

    // Realtime: re-fetch if any collection_records change within the date range
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase.channel(`collection-summary-${crypto.randomUUID()}`);
      channel
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'collection_records' },
            () => { fetchData(); })
        .subscribe();
    } catch (err) {
      console.warn('[useCollectionSummary] Realtime subscription failed (non-fatal):', err);
    }

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [dateFrom, dateTo]);

  const top10 = rows.slice(0, 10);
  return { rows, top10, loading, error };
}
```

---

### 13.3 `usePeriodTotals` — KPI Cards

```ts
// /src/hooks/usePeriodTotals.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { PeriodTotalsRow } from '../lib/database.types';

export interface PeriodTotalsResult {
  totals:  PeriodTotalsRow | null;
  loading: boolean;
  error:   string | null;
}

export function usePeriodTotals(dateFrom: string | null, dateTo: string | null): PeriodTotalsResult {
  const [totals,  setTotals]  = useState<PeriodTotalsRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      const { data, error: rpcErr } = await supabase
        .rpc('get_period_totals', { p_date_from: dateFrom, p_date_to: dateTo })
        .single();

      if (!cancelled) {
        if (rpcErr) setError(rpcErr.message);
        else        setTotals(data as PeriodTotalsRow);
        setLoading(false);
      }
    }

    fetchData();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase.channel(`period-totals-${crypto.randomUUID()}`);
      channel
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'collection_records' },
            () => { fetchData(); })
        .subscribe();
    } catch (err) {
      console.warn('[usePeriodTotals] Realtime subscription failed (non-fatal):', err);
    }

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [dateFrom, dateTo]);

  return { totals, loading, error };
}
```

---

### 13.4 `useMonthlyTrend` — Performance Chart

```ts
// /src/hooks/useMonthlyTrend.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { MonthlyTrendRow } from '../lib/database.types';

export interface MonthlyTrendResult {
  data:    MonthlyTrendRow[];
  loading: boolean;
  error:   string | null;
}

export function useMonthlyTrend(fiscalYear: number): MonthlyTrendResult {
  const [data,    setData]    = useState<MonthlyTrendRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    async function fetchData() {
      const { data: rows, error: rpcErr } = await supabase
        .rpc('get_monthly_trend', { p_fy_current: fiscalYear });

      if (rpcErr) setError(rpcErr.message);
      else        setData((rows ?? []) as MonthlyTrendRow[]);
      setLoading(false);
    }

    fetchData();
  }, [fiscalYear]);

  return { data, loading, error };
}
```

---

### 13.5 `usePaymentModeSplit` — Donut Chart

```ts
// /src/hooks/usePaymentModeSplit.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { PaymentModeSplitRow } from '../lib/database.types';

export interface PaymentModeSplitResult {
  rows:    PaymentModeSplitRow[];
  loading: boolean;
  error:   string | null;
}

export function usePaymentModeSplit(dateFrom: string | null, dateTo: string | null): PaymentModeSplitResult {
  const [rows,    setRows]    = useState<PaymentModeSplitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);

    async function fetchData() {
      const { data, error: rpcErr } = await supabase
        .rpc('get_payment_mode_split', { p_date_from: dateFrom, p_date_to: dateTo });

      if (rpcErr) setError(rpcErr.message);
      else        setRows((data ?? []) as PaymentModeSplitRow[]);
      setLoading(false);
    }

    fetchData();
  }, [dateFrom, dateTo]);

  return { rows, loading, error };
}
```

---

### 13.6 `useAvailableDates` — Calendar Picker

```ts
// /src/hooks/useAvailableDates.ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { VAvailableDateRow } from '../lib/database.types';

export interface AvailableDatesResult {
  dates:        VAvailableDateRow[];
  latestDate:   string | null;    // most recent date with data
  loading:      boolean;
  error:        string | null;
}

export function useAvailableDates(): AvailableDatesResult {
  const [dates,   setDates]   = useState<VAvailableDateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    async function fetchData() {
      const { data, error: fetchErr } = await supabase
        .from('v_available_dates')
        .select('*')
        .order('collection_date', { ascending: false })
        .limit(400);                     // covers ~1.1 fiscal years of daily data

      if (fetchErr) setError(fetchErr.message);
      else          setDates((data ?? []) as VAvailableDateRow[]);
      setLoading(false);
    }

    fetchData();
  }, []);

  const latestDate = dates.length > 0 ? dates[0].collection_date : null;
  return { dates, latestDate, loading, error };
}
```

---

### 13.7 `usePortfolios` — Portfolio Aggregation (unchanged logic)

Portfolio membership is a reporting rule kept in code, not in the database.
The hook now receives `CollectionSummaryRow[]` instead of `VCollectionSummaryRow[]`.

```ts
// /src/hooks/usePortfolios.ts — accepts the RPC result rows
import { useMemo } from 'react';
import type { CollectionSummaryRow } from '../lib/database.types';

export interface Portfolio {
  id:        string;
  name:      string;
  subtitle:  string;
  color:     string;
  bgColor:   string;
  initials:  string;
  members:   string[];
  total:     number;
  totalSPLY: number;
  growthPct: number;
}

// Portfolio membership definitions — update as SBU groupings change
export const PORTFOLIO_DEFS: Omit<Portfolio, 'total' | 'totalSPLY' | 'growthPct'>[] = [
  {
    id: 'pharma', name: 'ACI Pharma', subtitle: 'Local | HCE | NDDS | Lab EQ',
    color: '#00A65D', bgColor: '#ECFDF3', initials: 'ACI',
    members: ['Pharmaceuticals', 'Ndds', 'HealthCare Equipment', 'Lab Equipment & Accessories', 'ACI Formulations'],
  },
  {
    id: 'agribusiness', name: 'ACI Agribusiness', subtitle: 'Including Motors',
    color: '#66B663', bgColor: '#F0FDF4', initials: 'AG',
    members: ['Field Crops', 'Fertilizer', 'Vegetables', 'Harvester', 'Power Tiller',
              'Spare - Tractor', 'ACI Animal Genetics', 'Animal Health', 'FOTON', 'Mahindra'],
  },
  {
    id: 'yamaha', name: 'ACI Yamaha', subtitle: 'Motorcycles & Parts',
    color: '#E91922', bgColor: '#FEF3F2', initials: 'YM',
    members: ['Yamaha Motorcycles', 'Yamaha Spare Parts', 'Yamaha Apparels', 'Yamaha Music'],
  },
  {
    id: 'consumer', name: 'ACI Consumer', subtitle: 'FMCG & Hygiene',
    color: '#465FFF', bgColor: '#EEF2FF', initials: 'CN',
    members: ['Consumer', 'Hygiene', 'ACI Foods Limited', 'ACI Foods Limited (Rice Unit)',
              'ACI Edible Oils Limited', 'ACI Pure Flour Limited', 'ACI Salt Limited', 'Beverage', 'Flora'],
  },
  {
    id: 'motors', name: 'ACI Motors', subtitle: 'Vehicles & Spares',
    color: '#F79009', bgColor: '#FFFAEB', initials: 'MT',
    members: ['ACI Motors Limited', 'ACI Motors Service income', 'CEAT Tyre', 'Spare Parts', 'Tire', 'Liqui Moly', 'Lube Oil'],
  },
];

export function usePortfolios(rows: CollectionSummaryRow[]): Portfolio[] {
  return useMemo(() => {
    return PORTFOLIO_DEFS.map(def => {
      const memberRows = rows.filter(r => def.members.includes(r.business_name));
      const total      = memberRows.reduce((s, r) => s + (r.total_amount ?? 0), 0);
      const totalSPLY  = memberRows.reduce((s, r) => s + (r.total_sply   ?? 0), 0);
      const growthPct  = totalSPLY > 0
        ? parseFloat(((total - totalSPLY) / totalSPLY * 100).toFixed(2))
        : 0;
      return { ...def, total, totalSPLY, growthPct };
    });
  }, [rows]);
}
```

---

## 14. Component Migration Map

### Context Change

| v1 | v2 |
|---|---|
| `PeriodContext` — active period UUID | `DateFilterContext` — `{ preset, dateRange }` |
| `usePeriod().activePeriodId` | `useDateFilter().dateRange.{ dateFrom, dateTo }` |
| Period dropdown in TopBar selects a UUID | Filter bar selects a preset button or date range picker |

### Hook Signature Changes

| Hook | v1 signature | v2 signature |
|---|---|---|
| `useCollectionSummary` | `(periodId: string \| null)` | `(dateFrom: string \| null, dateTo: string \| null)` |
| `usePeriodTotals` | `(periodId: string \| null)` | `(dateFrom: string \| null, dateTo: string \| null)` |
| `usePaymentModeSplit` | `(periodId: string \| null)` | `(dateFrom: string \| null, dateTo: string \| null)` |
| `useMonthlyTrend` | `(fiscalYear: number)` | `(fiscalYear: number)` — unchanged |
| `usePortfolios` | `(rows: VCollectionSummaryRow[])` | `(rows: CollectionSummaryRow[])` — type rename only |

### Data Shape Changes (field renames)

| Old field | New field | Source |
|---|---|---|
| `period_id` | *(removed)* | All |
| `sply_period_id` | *(removed)* | `collection_records` |
| `collection_date` | `collection_date` (new) | `collection_records` |
| `period_label` | *(removed)* | All |
| `fiscal_year` | `fiscal_year` (computed) | `v_daily_collection`, RPC |
| `month_number` | `month_number` (computed) | `v_daily_collection`, RPC |
| `period_type` | *(removed)* | `collection_periods` |
| `is_locked` (on period) | `is_locked` (on `v_available_dates`, per-date) | `date_locks` |
| `VCollectionSummaryRow` | `CollectionSummaryRow` | RPC type |
| `VPeriodTotalsRow` | `PeriodTotalsRow` | RPC type |
| `VPaymentModeSplitRow` | `PaymentModeSplitRow` | RPC type |
| `VTopMoversRow` | `TopMoverRow` | RPC type |

---

## 15. Migration Guide — v1 → v2

> Run these steps **top-to-bottom** in Supabase SQL Editor. Back up all data first.

```sql
-- ══════════════════════════════════════════════════════════════
--  STEP 1 — Add collection_date to collection_records
-- ══════════════════════════════════════════════════════════════

ALTER TABLE collection_records
    ADD COLUMN IF NOT EXISTS collection_date DATE;

-- Back-fill from the joined collection_periods end_date
-- (end_date is used as the canonical snapshot date)
UPDATE collection_records cr
SET    collection_date = cp.end_date
FROM   collection_periods cp
WHERE  cr.period_id = cp.id;

-- Make the column non-nullable now that it is populated
ALTER TABLE collection_records
    ALTER COLUMN collection_date SET NOT NULL;


-- ══════════════════════════════════════════════════════════════
--  STEP 2 — Drop the period FKs and old columns
-- ══════════════════════════════════════════════════════════════

-- Remove the UNIQUE constraint that used period_id
ALTER TABLE collection_records
    DROP CONSTRAINT IF EXISTS collection_records_business_id_period_id_key;

-- Drop FK columns
ALTER TABLE collection_records
    DROP COLUMN IF EXISTS period_id,
    DROP COLUMN IF EXISTS sply_period_id;

-- Add the new unique constraint
ALTER TABLE collection_records
    ADD CONSTRAINT collection_records_business_id_collection_date_key
    UNIQUE (business_id, collection_date);


-- ══════════════════════════════════════════════════════════════
--  STEP 3 — Update import_logs
-- ══════════════════════════════════════════════════════════════

ALTER TABLE import_logs
    ADD COLUMN IF NOT EXISTS collection_date DATE;

-- Back-fill from collection_periods via the existing period_id
UPDATE import_logs il
SET    collection_date = cp.end_date
FROM   collection_periods cp
WHERE  il.period_id = cp.id;

-- Add skipped_businesses if missing
ALTER TABLE import_logs
    ADD COLUMN IF NOT EXISTS skipped_businesses TEXT[];

-- Drop the old FK column
ALTER TABLE import_logs
    DROP COLUMN IF EXISTS period_id;


-- ══════════════════════════════════════════════════════════════
--  STEP 4 — Create date_locks table
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS date_locks (
    collection_date  DATE         PRIMARY KEY,
    locked_by        UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
    locked_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    notes            TEXT
);

-- Migrate locked periods → locked dates
-- Each locked period becomes one date_lock row per day in its range
INSERT INTO date_locks (collection_date, notes)
SELECT gs::DATE, 'Migrated from locked period: ' || period_label
FROM   collection_periods cp,
       generate_series(cp.start_date, cp.end_date, INTERVAL '1 day') gs
WHERE  cp.is_locked = TRUE
ON CONFLICT (collection_date) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
--  STEP 5 — Create new indexes (see Section 4)
-- ══════════════════════════════════════════════════════════════

-- Run all CREATE INDEX statements from Section 4.
-- Drop old collection_periods indexes first:

DROP INDEX IF EXISTS idx_cp_fiscal_year;
DROP INDEX IF EXISTS idx_cp_period_type;
DROP INDEX IF EXISTS idx_cp_is_locked;
DROP INDEX IF EXISTS idx_cp_date_range;
DROP INDEX IF EXISTS idx_cr_period_id;
DROP INDEX IF EXISTS idx_cr_sply_period_id;
DROP INDEX IF EXISTS idx_cr_business_period;
DROP INDEX IF EXISTS idx_il_period_id;


-- ══════════════════════════════════════════════════════════════
--  STEP 6 — Create fiscal calendar functions (Section 3)
-- ══════════════════════════════════════════════════════════════

-- Run all CREATE OR REPLACE FUNCTION statements from Section 3.


-- ══════════════════════════════════════════════════════════════
--  STEP 7 — Drop old views, create new views and RPC functions
-- ══════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS v_top_movers;
DROP VIEW IF EXISTS v_payment_mode_split;
DROP VIEW IF EXISTS v_period_totals;
DROP VIEW IF EXISTS v_collection_summary;

-- Run all CREATE VIEW statements from Section 6.
-- Run all CREATE OR REPLACE FUNCTION statements from Section 7.


-- ══════════════════════════════════════════════════════════════
--  STEP 8 — Update RLS policies
-- ══════════════════════════════════════════════════════════════

-- Drop old collection_records policies that reference collection_periods
DROP POLICY IF EXISTS "Editors and admins can insert into unlocked periods" ON collection_records;
DROP POLICY IF EXISTS "Editors and admins can update unlocked periods"      ON collection_records;

-- Drop old collection_periods policies
DROP POLICY IF EXISTS "Authenticated users can read periods" ON collection_periods;
DROP POLICY IF EXISTS "Admins can insert periods"            ON collection_periods;
DROP POLICY IF EXISTS "Admins can update periods"            ON collection_periods;
DROP POLICY IF EXISTS "Admins can delete periods"            ON collection_periods;

-- Run the new RLS policies from Section 8.


-- ══════════════════════════════════════════════════════════════
--  STEP 9 — Drop the collection_periods table
--  Only run this after verifying all data was migrated correctly.
-- ══════════════════════════════════════════════════════════════

-- Verify migration:
-- SELECT COUNT(*) FROM collection_records WHERE collection_date IS NULL;
-- → Must return 0

DROP TRIGGER IF EXISTS trg_collection_periods_updated ON collection_periods;
DROP TABLE  IF EXISTS collection_periods;


-- ══════════════════════════════════════════════════════════════
--  STEP 10 — Smoke-test the new schema
-- ══════════════════════════════════════════════════════════════

-- Should return the correct 9M FY2025 totals:
SELECT grand_total, sply_grand_total, growth_pct
FROM get_period_totals('2024-07-01', '2025-03-31');

-- Should return 55 rows (one per active SBU):
SELECT COUNT(*) FROM get_collection_summary('2024-07-01', '2025-03-31');

-- Should return 3 rows (Credit, Cash, Deposit): --Error
SELECT * FROM get_payment_mode_split('2024-07-01', '2025-03-31');

-- Should return available dates:
SELECT * FROM v_available_dates LIMIT 10;
```

---

## 16. Maintenance & Utility Queries

```sql
-- ──────────────────────────────────────────────────────────────
--  M1. Add a new ENUM value for a new payment mode
-- ──────────────────────────────────────────────────────────────

ALTER TYPE payment_mode_type ADD VALUE 'Cheque';   -- example


-- ──────────────────────────────────────────────────────────────
--  M2. Soft-delete a business (preferred over hard delete)
-- ──────────────────────────────────────────────────────────────

UPDATE businesses SET is_active = FALSE WHERE id = '<BUSINESS_UUID>';


-- ──────────────────────────────────────────────────────────────
--  M3. Lock / unlock a date range (admin only via RPC)
-- ──────────────────────────────────────────────────────────────

SELECT lock_date_range('2025-03-01', '2025-03-31', 'March month-end close');
SELECT unlock_date_range('2025-03-31', '2025-03-31');  -- re-open one day


-- ──────────────────────────────────────────────────────────────
--  M4. Row counts across all tables (quick health check)
-- ──────────────────────────────────────────────────────────────

SELECT 'businesses'          AS tbl, COUNT(*) FROM businesses
UNION ALL
SELECT 'collection_records'  AS tbl, COUNT(*) FROM collection_records
UNION ALL
SELECT 'user_profiles'       AS tbl, COUNT(*) FROM user_profiles
UNION ALL
SELECT 'import_logs'         AS tbl, COUNT(*) FROM import_logs
UNION ALL
SELECT 'date_locks'          AS tbl, COUNT(*) FROM date_locks;


-- ──────────────────────────────────────────────────────────────
--  M5. Verify no duplicate (business, date) pairs exist
-- ──────────────────────────────────────────────────────────────

SELECT business_id, collection_date, COUNT(*) AS cnt
FROM   collection_records
GROUP  BY business_id, collection_date
HAVING COUNT(*) > 1;
-- Should return 0 rows (UNIQUE constraint enforces this)


-- ──────────────────────────────────────────────────────────────
--  M6. Find dates with incomplete data
--      (fewer than 55 SBUs reported)
-- ──────────────────────────────────────────────────────────────

SELECT collection_date, sbu_count, day_total
FROM   v_available_dates
WHERE  sbu_count < 55
ORDER  BY collection_date DESC;


-- ──────────────────────────────────────────────────────────────
--  M7. List all locked dates
-- ──────────────────────────────────────────────────────────────

SELECT collection_date, locked_at, notes
FROM   date_locks
ORDER  BY collection_date DESC;


-- ──────────────────────────────────────────────────────────────
--  M8. Fiscal year summary (YTD total per fiscal year)
-- ──────────────────────────────────────────────────────────────

SELECT
    fiscal_year(collection_date) AS fy,
    SUM(total_amount)            AS total,
    COUNT(DISTINCT collection_date) AS trading_days,
    COUNT(DISTINCT business_id)  AS active_sbus
FROM collection_records
GROUP BY fiscal_year(collection_date)
ORDER BY fy DESC;


-- ──────────────────────────────────────────────────────────────
--  M9. Sanity check: growth_pct inline vs RPC
-- ──────────────────────────────────────────────────────────────

SELECT
    business_name,
    total_amount,
    total_sply,
    growth_pct
FROM get_collection_summary('2024-07-01', '2025-03-31')
ORDER BY growth_pct DESC NULLS LAST;
```

---

## 17. Teardown Script

> **⚠ WARNING:** This permanently deletes all data. Only use in development. Never run on production.

```sql
-- ══════════════════════════════════════════════════════════════
--  TEARDOWN — drops everything in reverse dependency order
-- ══════════════════════════════════════════════════════════════

-- Triggers
DROP TRIGGER IF EXISTS on_auth_user_created           ON auth.users;
DROP TRIGGER IF EXISTS trg_user_profiles_updated      ON user_profiles;
DROP TRIGGER IF EXISTS trg_collection_records_updated ON collection_records;
DROP TRIGGER IF EXISTS trg_businesses_updated         ON businesses;

-- RPC Functions
DROP FUNCTION IF EXISTS get_top_movers(DATE, DATE, INT);
DROP FUNCTION IF EXISTS get_daily_trend(DATE, DATE);
DROP FUNCTION IF EXISTS get_monthly_trend(SMALLINT, SMALLINT);
DROP FUNCTION IF EXISTS get_payment_mode_split(DATE, DATE);
DROP FUNCTION IF EXISTS get_period_totals(DATE, DATE);
DROP FUNCTION IF EXISTS get_collection_summary(DATE, DATE);

-- Fiscal & lock helper functions
DROP FUNCTION IF EXISTS unlock_date_range(DATE, DATE);
DROP FUNCTION IF EXISTS lock_date_range(DATE, DATE, TEXT);
DROP FUNCTION IF EXISTS sply_range(DATE, DATE);
DROP FUNCTION IF EXISTS fiscal_quarter_start(DATE);
DROP FUNCTION IF EXISTS fiscal_year_start(SMALLINT);
DROP FUNCTION IF EXISTS fiscal_quarter(DATE);
DROP FUNCTION IF EXISTS fiscal_year(DATE);

-- Trigger functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS set_updated_at();

-- Views
DROP VIEW IF EXISTS v_payment_mode_split_daily;
DROP VIEW IF EXISTS v_available_dates;
DROP VIEW IF EXISTS v_daily_collection;

-- Tables (reverse dependency order)
DROP TABLE IF EXISTS import_logs;
DROP TABLE IF EXISTS date_locks;
DROP TABLE IF EXISTS collection_records;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS businesses;

-- ENUM
DROP TYPE IF EXISTS payment_mode_type;
```

---

*Last updated: April 2026 | Schema v2 — Daily-base design, `collection_periods` eliminated*
