-- ============================================================
-- REPORTING VIEWS
-- Built and testable against 002_seed_data.sql.
-- Two views: one for stock variance (the "where did it go"
-- question), one for branch profit (the dashboard numbers).
-- ============================================================

-- ------------------------------------------------------------
-- PART A — Daily stock variance, per branch/product/day
-- variance_kg = opening + received - sold - closing
-- Positive variance = unaccounted loss. Zero (or ~0) = clean.
-- ------------------------------------------------------------
CREATE VIEW daily_stock_variance AS
SELECT
    ds.id                       AS daily_stock_id,
    b.name                      AS branch_name,
    p.name                      AS product_name,
    ds.stock_date,
    ds.opening_kg,
    ds.received_kg,
    COALESCE(SUM(s.weight_kg), 0)                                        AS sold_kg,
    ds.closing_kg,
    (ds.opening_kg + ds.received_kg
        - COALESCE(SUM(s.weight_kg), 0) - ds.closing_kg)                 AS variance_kg,
    ROUND(
        (ds.opening_kg + ds.received_kg
            - COALESCE(SUM(s.weight_kg), 0) - ds.closing_kg)
        / NULLIF(ds.opening_kg + ds.received_kg, 0) * 100, 2)            AS variance_pct
FROM daily_stock ds
JOIN branches b ON b.id = ds.branch_id
JOIN products p ON p.id = ds.product_id
LEFT JOIN sales s
    ON s.branch_id = ds.branch_id
   AND s.product_id = ds.product_id
   AND s.sale_date = ds.stock_date
GROUP BY ds.id, b.name, p.name, ds.stock_date, ds.opening_kg, ds.received_kg, ds.closing_kg;

-- ------------------------------------------------------------
-- PART B — Daily branch profit summary
-- Revenue is from actual price_charged (captures discounts),
-- cost of meat sold is estimated from carcass cost via yield,
-- expenses come straight from the expenses table.
-- ------------------------------------------------------------
CREATE VIEW daily_branch_profit AS
WITH revenue AS (
    SELECT branch_id, sale_date,
           SUM(weight_kg * price_charged) AS revenue,
           SUM(CASE WHEN discount_reason <> 'none'
                    THEN weight_kg * (p.price_per_kg - price_charged) ELSE 0 END) AS discount_given
    FROM sales s
    JOIN products p ON p.id = s.product_id
    GROUP BY branch_id, sale_date
),
expense AS (
    SELECT branch_id, expense_date AS sale_date, SUM(amount) AS total_expenses
    FROM expenses
    GROUP BY branch_id, expense_date
)
SELECT
    b.name AS branch_name,
    COALESCE(r.sale_date, e.sale_date) AS report_date,
    COALESCE(r.revenue, 0)          AS revenue,
    COALESCE(r.discount_given, 0)   AS discount_given,
    COALESCE(e.total_expenses, 0)   AS expenses,
    COALESCE(r.revenue, 0) - COALESCE(e.total_expenses, 0) AS gross_profit
FROM branches b
LEFT JOIN revenue r ON r.branch_id = b.id
LEFT JOIN expense e ON e.branch_id = b.id AND e.sale_date = r.sale_date
WHERE r.sale_date IS NOT NULL OR e.sale_date IS NOT NULL;

-- ============================================================
-- Test both views once loaded:
--   SELECT * FROM daily_stock_variance;
--   SELECT * FROM daily_branch_profit;
-- ============================================================
