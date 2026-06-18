-- ══════════════════════════════════════════════════════════════
-- ACI Collection Dashboard - Required Database Functions
-- ══════════════════════════════════════════════════════════════
-- Run this SQL script in your Supabase SQL Editor to create all
-- required database functions for the dashboard to work properly.
--
-- Actual table schemas:
--   businesses(id UUID, name TEXT, short_code TEXT, category TEXT,
--              parent_id UUID, is_active BOOL, sort_order INT,
--              created_at, updated_at)
--
--   collection_records(id UUID, business_id UUID, collection_date DATE,
--              credit_amount NUMERIC, cash_amount NUMERIC,
--              deposit_amount NUMERIC,
--              total_cash_amount NUMERIC [generated: cash+deposit],
--              total_amount NUMERIC [generated: credit+cash+deposit],
--              data_source, notes, created_by, updated_by,
--              created_at, updated_at)
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. FISCAL YEAR HELPER FUNCTIONS
-- ──────────────────────────────────────────────────────────────

-- 1A. fiscal_year(date) - Returns fiscal year for a given date
-- Example: fiscal_year('2024-09-15') returns 2025 (Jul–Jun cycle)
CREATE OR REPLACE FUNCTION fiscal_year(d DATE)
RETURNS SMALLINT
LANGUAGE SQL IMMUTABLE STRICT AS $$
    SELECT CASE
        WHEN EXTRACT(MONTH FROM d) >= 7
        THEN (EXTRACT(YEAR FROM d)::SMALLINT + 1)
        ELSE  EXTRACT(YEAR FROM d)::SMALLINT
    END;
$$;

-- 1B. fiscal_quarter(date) - Returns fiscal quarter (1-4)
-- Q1 = Jul–Sep | Q2 = Oct–Dec | Q3 = Jan–Mar | Q4 = Apr–Jun
CREATE OR REPLACE FUNCTION fiscal_quarter(d DATE)
RETURNS SMALLINT
LANGUAGE SQL IMMUTABLE STRICT AS $$
    SELECT CASE
        WHEN EXTRACT(MONTH FROM d) IN (7, 8, 9)    THEN 1
        WHEN EXTRACT(MONTH FROM d) IN (10, 11, 12)  THEN 2
        WHEN EXTRACT(MONTH FROM d) IN (1, 2, 3)    THEN 3
        WHEN EXTRACT(MONTH FROM d) IN (4, 5, 6)    THEN 4
    END::SMALLINT;
$$;

-- 1C. fiscal_year_start(fiscal_year) - Returns start date of a fiscal year
-- Example: fiscal_year_start(2025) returns '2024-07-01'
-- Uses INTEGER (not SMALLINT) because SMALLINT + 1 promotes to INTEGER in PG.
CREATE OR REPLACE FUNCTION fiscal_year_start(fy INTEGER)
RETURNS DATE
LANGUAGE SQL IMMUTABLE STRICT AS $$
    SELECT make_date(fy - 1, 7, 1);
$$;

-- 1D. fiscal_quarter_start(date) - Returns first day of the fiscal quarter
CREATE OR REPLACE FUNCTION fiscal_quarter_start(d DATE)
RETURNS DATE
LANGUAGE SQL IMMUTABLE STRICT AS $$
    SELECT CASE
        WHEN EXTRACT(MONTH FROM d) IN (7, 8, 9)    THEN make_date(EXTRACT(YEAR FROM d)::INT,  7, 1)
        WHEN EXTRACT(MONTH FROM d) IN (10, 11, 12)  THEN make_date(EXTRACT(YEAR FROM d)::INT, 10, 1)
        WHEN EXTRACT(MONTH FROM d) IN (1, 2, 3)    THEN make_date(EXTRACT(YEAR FROM d)::INT,  1, 1)
        WHEN EXTRACT(MONTH FROM d) IN (4, 5, 6)    THEN make_date(EXTRACT(YEAR FROM d)::INT,  4, 1)
    END::DATE;
$$;


-- ──────────────────────────────────────────────────────────────
-- 2. SPLY (SAME PERIOD LAST YEAR) HELPER
-- ──────────────────────────────────────────────────────────────

-- sply_range(date_from, date_to) - Returns the SPLY date range (1 year prior)
CREATE OR REPLACE FUNCTION sply_range(
    p_date_from DATE,
    p_date_to   DATE,
    OUT sply_from DATE,
    OUT sply_to   DATE
)
LANGUAGE SQL IMMUTABLE STRICT AS $$
    SELECT
        (p_date_from - INTERVAL '1 year')::DATE,
        (p_date_to   - INTERVAL '1 year')::DATE;
$$;


-- ──────────────────────────────────────────────────────────────
-- 3. MAIN RPC FUNCTIONS FOR DASHBOARD
-- ──────────────────────────────────────────────────────────────

-- 3A. get_collection_summary(date_from, date_to)
-- Returns per-SBU totals for the current period and SPLY.
-- Return shape matches CollectionSummaryRow in database.types.ts.
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
    -- Current period
    credit_amount     NUMERIC,
    cash_amount       NUMERIC,
    deposit_amount    NUMERIC,
    total_cash_amount NUMERIC,
    total_amount      NUMERIC,
    -- SPLY
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
    WITH current_period AS (
        SELECT
            cr.business_id,
            COUNT(*)                        AS rec_count,
            SUM(cr.credit_amount)           AS credit_amt,
            SUM(cr.cash_amount)             AS cash_amt,
            SUM(cr.deposit_amount)          AS deposit_amt,
            SUM(cr.total_cash_amount)       AS total_cash_amt,
            SUM(cr.total_amount)            AS total_amt
        FROM collection_records cr
        WHERE cr.collection_date BETWEEN p_date_from AND p_date_to
        GROUP BY cr.business_id
    ),
    sply_period AS (
        SELECT
            cr.business_id,
            SUM(cr.credit_amount)           AS credit_amt,
            SUM(cr.cash_amount)             AS cash_amt,
            SUM(cr.deposit_amount)          AS deposit_amt,
            SUM(cr.total_cash_amount)       AS total_cash_amt,
            SUM(cr.total_amount)            AS total_amt
        FROM collection_records cr
        WHERE cr.collection_date BETWEEN v_sply_from AND v_sply_to
        GROUP BY cr.business_id
    )
    SELECT
        COALESCE(cp.rec_count, 0)::BIGINT           AS record_count,
        b.id                                         AS business_id,
        b.name                                       AS business_name,
        b.short_code,
        b.category,
        b.sort_order,
        COALESCE(cp.credit_amt,    0)               AS credit_amount,
        COALESCE(cp.cash_amt,      0)               AS cash_amount,
        COALESCE(cp.deposit_amt,   0)               AS deposit_amount,
        COALESCE(cp.total_cash_amt,0)               AS total_cash_amount,
        COALESCE(cp.total_amt,     0)               AS total_amount,
        COALESCE(sp.credit_amt,    0)               AS credit_sply,
        COALESCE(sp.cash_amt,      0)               AS cash_sply,
        COALESCE(sp.deposit_amt,   0)               AS deposit_sply,
        COALESCE(sp.total_cash_amt,0)               AS total_cash_sply,
        COALESCE(sp.total_amt,     0)               AS total_sply,
        (COALESCE(cp.total_amt, 0) - COALESCE(sp.total_amt, 0))
                                                     AS total_delta,
        CASE
            WHEN COALESCE(sp.total_amt, 0) = 0 THEN NULL
            ELSE ROUND(
                (COALESCE(cp.total_amt, 0) - COALESCE(sp.total_amt, 0))
                / COALESCE(sp.total_amt, 0) * 100,
                2
            )
        END                                          AS growth_pct
    FROM businesses b
    LEFT JOIN current_period cp ON cp.business_id = b.id
    LEFT JOIN sply_period    sp ON sp.business_id = b.id
    WHERE b.is_active = TRUE
    ORDER BY COALESCE(cp.total_amt, 0) DESC;
END;
$$;


-- 3B. get_monthly_trend(p_fy_current, p_fy_sply)
-- Returns 12 monthly data points (Jul → Jun) for the current FY and SPLY.
-- Return shape matches MonthlyTrendRow in database.types.ts.
CREATE OR REPLACE FUNCTION get_monthly_trend(
    p_fy_current SMALLINT,
    p_fy_sply    SMALLINT DEFAULT NULL
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
    v_fy_sply    SMALLINT := COALESCE(p_fy_sply, p_fy_current - 1);
    v_curr_start DATE     := fiscal_year_start(p_fy_current::INTEGER);
    v_curr_end   DATE     := (fiscal_year_start(p_fy_current::INTEGER + 1) - 1)::DATE;
    v_sply_start DATE     := fiscal_year_start(v_fy_sply::INTEGER);
    v_sply_end   DATE     := (fiscal_year_start(v_fy_sply::INTEGER + 1) - 1)::DATE;
BEGIN
    RETURN QUERY
    WITH months AS (
        SELECT
            generate_series(v_curr_start, v_curr_end, INTERVAL '1 month')::DATE AS month_start
    ),
    current_monthly AS (
        SELECT
            EXTRACT(MONTH FROM cr.collection_date)::SMALLINT AS mnum,
            SUM(cr.total_amount)                              AS total
        FROM collection_records cr
        WHERE cr.collection_date BETWEEN v_curr_start AND v_curr_end
        GROUP BY mnum
    ),
    sply_monthly AS (
        SELECT
            EXTRACT(MONTH FROM cr.collection_date)::SMALLINT AS mnum,
            SUM(cr.total_amount)                              AS total
        FROM collection_records cr
        WHERE cr.collection_date BETWEEN v_sply_start AND v_sply_end
        GROUP BY mnum
    )
    SELECT
        EXTRACT(MONTH FROM m.month_start)::SMALLINT   AS month_number,
        TO_CHAR(m.month_start, 'Mon')                  AS month_label,
        p_fy_current                                   AS fiscal_year,
        COALESCE(c.total, 0)                           AS current_total,
        COALESCE(s.total, 0)                           AS sply_total
    FROM months m
    LEFT JOIN current_monthly c
           ON c.mnum = EXTRACT(MONTH FROM m.month_start)
    LEFT JOIN sply_monthly    s
           ON s.mnum = EXTRACT(MONTH FROM m.month_start)
    ORDER BY m.month_start;
END;
$$;


-- ══════════════════════════════════════════════════════════════
-- DONE!
-- ══════════════════════════════════════════════════════════════
-- All required functions have been created.
-- Copy and paste the entire contents of this file into the
-- Supabase SQL Editor and click "Run" to apply.
-- ══════════════════════════════════════════════════════════════
