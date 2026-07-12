-- ============================================================
-- STOCK AUTOMATION
-- Two independent triggers, kept separate on purpose so each
-- can be tested and debugged on its own:
--   1. opening_kg auto-fills from yesterday's closing_kg
--      (only when explicitly inserted as NULL — omitting the
--      column still uses the table's default of 0)
--   2. received_kg auto-fills from branch_transfers, creating
--      or updating the day's daily_stock row automatically
-- closing_kg is NEVER touched by triggers — it must always
-- come from a physical night count, entered by a person.
-- ============================================================

-- ------------------------------------------------------------
-- PART A — Auto-fill opening_kg from previous day's closing_kg
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_fill_opening_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_prev_closing NUMERIC;
BEGIN
    IF NEW.opening_kg IS NULL THEN
        SELECT closing_kg INTO v_prev_closing
        FROM daily_stock
        WHERE branch_id = NEW.branch_id
          AND product_id = NEW.product_id
          AND stock_date < NEW.stock_date
        ORDER BY stock_date DESC
        LIMIT 1;

        NEW.opening_kg := COALESCE(v_prev_closing, 0);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER daily_stock_before_insert
BEFORE INSERT ON daily_stock
FOR EACH ROW
EXECUTE FUNCTION trg_fill_opening_stock();

-- ------------------------------------------------------------
-- PART B — Auto-fill received_kg from branch_transfers
-- Creates the day's daily_stock row if it doesn't exist yet,
-- or adds to received_kg if it does (in case of multiple
-- transfers to the same branch/product/day).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_transfer_to_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_product_id INTEGER;
BEGIN
    SELECT product_id INTO v_product_id
    FROM breakdown_records
    WHERE id = NEW.breakdown_record_id;

    INSERT INTO daily_stock (branch_id, product_id, stock_date, opening_kg, received_kg, closing_kg)
    VALUES (NEW.to_branch_id, v_product_id, NEW.transfer_date, NULL, NEW.weight_sent_kg, 0)
    ON CONFLICT (branch_id, product_id, stock_date)
    DO UPDATE SET received_kg = daily_stock.received_kg + EXCLUDED.received_kg;

    RETURN NEW;
END;
$$;

CREATE TRIGGER branch_transfer_after_insert
AFTER INSERT ON branch_transfers
FOR EACH ROW
EXECUTE FUNCTION trg_transfer_to_stock();

-- ============================================================
-- TEST after running this file:
--
-- 1. Check today's closing_kg for Beef cuts, Main branch (should be 9.00):
--    SELECT stock_date, closing_kg FROM daily_stock
--    WHERE branch_id = (SELECT id FROM branches WHERE name = 'Main branch')
--      AND product_id = (SELECT id FROM products WHERE name = 'Beef cuts');
--
-- 2. Insert a new transfer for TOMORROW, reusing today's breakdown record:
--    INSERT INTO branch_transfers (breakdown_record_id, to_branch_id, weight_sent_kg, transfer_date)
--    VALUES (
--        (SELECT br.id FROM breakdown_records br
--         JOIN products p ON p.id = br.product_id
--         WHERE p.name = 'Beef cuts' LIMIT 1),
--        (SELECT id FROM branches WHERE name = 'Main branch'),
--        15.00, CURRENT_DATE + 1
--    );
--
-- 3. Check the new row was created automatically:
--    SELECT stock_date, opening_kg, received_kg, closing_kg FROM daily_stock
--    WHERE branch_id = (SELECT id FROM branches WHERE name = 'Main branch')
--      AND product_id = (SELECT id FROM products WHERE name = 'Beef cuts')
--    ORDER BY stock_date;
--
--    Expected new row: stock_date = tomorrow, opening_kg = 9.00
--    (pulled from today's closing), received_kg = 15.00, closing_kg = 0.00
-- ============================================================
