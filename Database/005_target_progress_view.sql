-- ============================================================
-- TARGET COMPARISON VIEW
-- Depends on: daily_branch_profit (003), profit_targets (001)
-- Powers the "78% of target" numbers and branch comparison
-- from the dashboard wireframe.
-- ============================================================

CREATE VIEW branch_target_progress AS
SELECT
    pt.id AS profit_target_id,
    b.name AS branch_name,
    pt.period_type,
    pt.period_start,
    (CASE pt.period_type
        WHEN 'daily'   THEN pt.period_start
        WHEN 'weekly'  THEN pt.period_start + INTERVAL '6 days'
        WHEN 'monthly' THEN (pt.period_start + INTERVAL '1 month' - INTERVAL '1 day')
    END)::DATE AS period_end,
    pt.target_amount,
    COALESCE(SUM(dbp.gross_profit), 0) AS actual_profit,
    ROUND(
        COALESCE(SUM(dbp.gross_profit), 0) / NULLIF(pt.target_amount, 0) * 100, 1
    ) AS pct_of_target
FROM profit_targets pt
JOIN branches b ON b.id = pt.branch_id
LEFT JOIN daily_branch_profit dbp
    ON dbp.branch_name = b.name
   AND dbp.report_date BETWEEN pt.period_start AND (CASE pt.period_type
        WHEN 'daily'   THEN pt.period_start
        WHEN 'weekly'  THEN pt.period_start + INTERVAL '6 days'
        WHEN 'monthly' THEN (pt.period_start + INTERVAL '1 month' - INTERVAL '1 day')
   END)::DATE
GROUP BY pt.id, b.name, pt.period_type, pt.period_start, pt.target_amount;

-- ============================================================
-- TEST after running this file:
--   SELECT branch_name, period_type, target_amount, actual_profit, pct_of_target
--   FROM branch_target_progress;
--
-- Expected from seed data: Main branch, weekly, target 48000,
-- actual_profit 43550 (from daily_branch_profit), pct ~90.7%
-- (only one day of sales exists in seed data, so this is a
-- partial-week number, not a real shortfall)
-- ============================================================
