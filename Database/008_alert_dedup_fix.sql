-- ============================================================
-- ALERT REFINEMENTS — fixing duplicate notifications
--
-- Two separate problems, two separate fixes:
--   1. The credit trigger fired on every balance change while
--      already over limit, not just when newly crossing it.
--   2. check_variance_alerts / check_profit_alerts /
--      check_target_alerts had no way to know they'd already
--      generated an alert for that business date, so calling
--      them twice created duplicates.
-- ============================================================

-- ------------------------------------------------------------
-- PART A — Add alert_date: the business date an alert concerns,
-- separate from created_at (when it was generated). This is
-- what makes de-duplication possible.
-- ------------------------------------------------------------
ALTER TABLE notifications ADD COLUMN alert_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- ------------------------------------------------------------
-- PART B — Credit alert: only fire when NEWLY crossing the limit,
-- not on every subsequent update while still over it.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_check_credit_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.balance_owed > NEW.credit_limit
       AND (OLD.balance_owed <= OLD.credit_limit) THEN
        INSERT INTO notifications (customer_id, alert_type, message, severity, alert_date)
        VALUES (
            NEW.id, 'high_credit_balance',
            NEW.name || ' crossed their credit limit of ' || NEW.credit_limit ||
                ', now owes ' || NEW.balance_owed,
            'warning', CURRENT_DATE
        );
    END IF;
    RETURN NEW;
END;
$$;
-- Trigger definition itself is unchanged, this REPLACE updates its behavior.

-- ------------------------------------------------------------
-- PART C — Variance alerts: clear today's prior alerts for this
-- date before regenerating, so re-running is safe.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_variance_alerts(p_date DATE)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
BEGIN
    DELETE FROM notifications WHERE alert_type = 'high_variance' AND alert_date = p_date;

    FOR r IN
        SELECT branch_name, product_name, variance_kg, variance_pct
        FROM daily_stock_variance
        WHERE stock_date = p_date AND variance_pct > 5
    LOOP
        INSERT INTO notifications (branch_id, alert_type, message, severity, alert_date)
        VALUES (
            (SELECT id FROM branches WHERE name = r.branch_name),
            'high_variance',
            r.branch_name || ': ' || r.product_name || ' variance is ' ||
                r.variance_kg || 'kg (' || r.variance_pct || '%), above normal',
            CASE WHEN r.variance_pct > 15 THEN 'critical' ELSE 'warning' END,
            p_date
        );
    END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- PART D — Profit alerts: same clear-then-regenerate pattern
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_profit_alerts(p_date DATE)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
BEGIN
    DELETE FROM notifications WHERE alert_type = 'negative_profit' AND alert_date = p_date;

    FOR r IN
        SELECT branch_name, gross_profit
        FROM daily_branch_profit
        WHERE report_date = p_date AND gross_profit < 0
    LOOP
        INSERT INTO notifications (branch_id, alert_type, message, severity, alert_date)
        VALUES (
            (SELECT id FROM branches WHERE name = r.branch_name),
            'negative_profit',
            r.branch_name || ' made a loss of ' || ABS(r.gross_profit) || ' today',
            'critical', p_date
        );
    END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- PART E — Target alerts: dedupe by today's generation date,
-- since target periods don't map to a single day cleanly
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_target_alerts()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
BEGIN
    DELETE FROM notifications WHERE alert_type = 'target_performance' AND alert_date = CURRENT_DATE;

    FOR r IN
        SELECT branch_name, pct_of_target, period_type
        FROM branch_target_progress
        WHERE pct_of_target < 80
    LOOP
        INSERT INTO notifications (branch_id, alert_type, message, severity, alert_date)
        VALUES (
            (SELECT id FROM branches WHERE name = r.branch_name),
            'target_performance',
            r.branch_name || ' is at ' || r.pct_of_target || '% of its ' || r.period_type || ' target',
            'warning', CURRENT_DATE
        );
    END LOOP;
END;
$$;

-- ============================================================
-- TEST after running this file:
--
-- 1. Clear out the duplicate mess from before (safe to do now,
--    since this was test data):
--    DELETE FROM notifications;
--
-- 2. Re-run the checks:
--    SELECT check_variance_alerts(CURRENT_DATE);
--    SELECT check_profit_alerts(CURRENT_DATE);
--    SELECT check_target_alerts();
--
-- 3. Run the SAME check_variance_alerts call again immediately:
--    SELECT check_variance_alerts(CURRENT_DATE);
--
-- 4. Count how many high_variance alerts exist for today:
--    SELECT COUNT(*) FROM notifications
--    WHERE alert_type = 'high_variance' AND alert_date = CURRENT_DATE;
--
--    Expected: still just 3 (Liver, Bones, Fat) — not 6.
--    That proves re-running the check no longer duplicates.
-- ============================================================
