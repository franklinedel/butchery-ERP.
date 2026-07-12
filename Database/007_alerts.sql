-- ============================================================
-- ALERTS
-- Covers the four alert types agreed earlier:
--   A. Variance/loss higher than normal for a branch
--   B. A branch makes a loss (negative profit) that day
--   C. A customer's credit balance gets too high
--   D. Branch performance vs target (also enables comparing
--      branches against each other, using the same numbers)
--
-- Thresholds below are starting points — easy to change later:
--   variance threshold: 5%
--   target underperformance threshold: 80%
--   credit limit: per-customer column, default 3000
-- ============================================================

-- ------------------------------------------------------------
-- PART A — Notifications table
-- ------------------------------------------------------------
CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    branch_id   INTEGER REFERENCES branches(id),
    customer_id INTEGER REFERENCES customers(id),
    alert_type  VARCHAR(30) NOT NULL CHECK (alert_type IN
                    ('high_variance', 'negative_profit', 'high_credit_balance', 'target_performance')),
    message     TEXT NOT NULL,
    severity    VARCHAR(10) NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- PART B — Credit limit per customer (needed for alert C)
-- ------------------------------------------------------------
ALTER TABLE customers ADD COLUMN credit_limit NUMERIC(12,2) NOT NULL DEFAULT 3000.00;

-- ------------------------------------------------------------
-- PART C — Alert: customer credit balance too high
-- Fires automatically whenever balance_owed changes.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_check_credit_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.balance_owed > NEW.credit_limit THEN
        INSERT INTO notifications (customer_id, alert_type, message, severity)
        VALUES (
            NEW.id, 'high_credit_balance',
            NEW.name || ' owes ' || NEW.balance_owed || ', above their limit of ' || NEW.credit_limit,
            'warning'
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER customers_after_update_balance
AFTER UPDATE OF balance_owed ON customers
FOR EACH ROW
EXECUTE FUNCTION trg_check_credit_limit();

-- ------------------------------------------------------------
-- PART D — Alert: variance higher than normal (call daily)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_variance_alerts(p_date DATE)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT branch_name, product_name, variance_kg, variance_pct
        FROM daily_stock_variance
        WHERE stock_date = p_date AND variance_pct > 5
    LOOP
        INSERT INTO notifications (branch_id, alert_type, message, severity)
        VALUES (
            (SELECT id FROM branches WHERE name = r.branch_name),
            'high_variance',
            r.branch_name || ': ' || r.product_name || ' variance is ' ||
                r.variance_kg || 'kg (' || r.variance_pct || '%), above normal',
            CASE WHEN r.variance_pct > 15 THEN 'critical' ELSE 'warning' END
        );
    END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- PART E — Alert: branch made a loss that day (call daily)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_profit_alerts(p_date DATE)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT branch_name, gross_profit
        FROM daily_branch_profit
        WHERE report_date = p_date AND gross_profit < 0
    LOOP
        INSERT INTO notifications (branch_id, alert_type, message, severity)
        VALUES (
            (SELECT id FROM branches WHERE name = r.branch_name),
            'negative_profit',
            r.branch_name || ' made a loss of ' || ABS(r.gross_profit) || ' today',
            'critical'
        );
    END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- PART F — Alert: branch underperforming target (call as needed)
-- Also doubles as the data source for branch-vs-branch comparison,
-- since it returns every branch's pct_of_target side by side.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_target_alerts()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT branch_name, pct_of_target, period_type
        FROM branch_target_progress
        WHERE pct_of_target < 80
    LOOP
        INSERT INTO notifications (branch_id, alert_type, message, severity)
        VALUES (
            (SELECT id FROM branches WHERE name = r.branch_name),
            'target_performance',
            r.branch_name || ' is at ' || r.pct_of_target || '% of its ' || r.period_type || ' target',
            'warning'
        );
    END LOOP;
END;
$$;

-- ============================================================
-- TEST after running this file:
--
-- 1. Trigger a credit alert (push Mama Njeri's balance up again):
--    INSERT INTO sales (branch_id, product_id, customer_id, sale_date,
--                        weight_kg, price_charged, payment_type, discount_reason)
--    VALUES (
--        (SELECT id FROM branches WHERE name = 'Main branch'),
--        (SELECT id FROM products WHERE name = 'Beef cuts'),
--        (SELECT id FROM customers WHERE name = 'Mama Njeri'),
--        CURRENT_DATE, 1.00, 650.00, 'credit', 'regular_customer'
--    );
--    -- her balance is already 3650 (over the 3000 default limit),
--    -- this update should now fire the credit alert
--
-- 2. Run the variance and profit checks for today:
--    SELECT check_variance_alerts(CURRENT_DATE);
--    SELECT check_profit_alerts(CURRENT_DATE);
--    SELECT check_target_alerts();
--
-- 3. See everything that fired:
--    SELECT alert_type, message, severity, created_at
--    FROM notifications ORDER BY created_at DESC;
--
-- Expected: at least one high_credit_balance alert for Mama Njeri,
-- and high_variance alerts for Liver, Bones, and Fat (they had no
-- sales recorded in the seed data, so their variance is high).
-- ============================================================
