-- ============================================================
-- TRIGGERS — Automated customer balance updates
-- Two triggers only, both narrow and testable:
--   1. A credit sale increases the customer's balance owed
--   2. A payment decreases it
-- No trigger touches inventory yet — that's deliberately left
-- out until daily_stock automation is designed and agreed.
-- ============================================================

-- ------------------------------------------------------------
-- PART A — Credit sale increases balance owed
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_credit_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.payment_type = 'credit' AND NEW.customer_id IS NOT NULL THEN
        UPDATE customers
        SET balance_owed = balance_owed + (NEW.weight_kg * NEW.price_charged)
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER sales_after_insert_credit
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION trg_credit_sale();

-- ------------------------------------------------------------
-- PART B — Payment decreases balance owed
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_payment_received()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE customers
    SET balance_owed = balance_owed - NEW.amount
    WHERE id = NEW.customer_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER payments_after_insert
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION trg_payment_received();

-- ============================================================
-- TEST after running this file:
--
-- 1. Check Mama Njeri's current balance (should be 2400 from seed data):
--    SELECT name, balance_owed FROM customers;
--
-- 2. Insert a new credit sale for her (5kg beef at 650):
--    INSERT INTO sales (branch_id, product_id, customer_id, sale_date,
--                        weight_kg, price_charged, payment_type, discount_reason)
--    VALUES (
--        (SELECT id FROM branches WHERE name = 'Main branch'),
--        (SELECT id FROM products WHERE name = 'Beef cuts'),
--        (SELECT id FROM customers WHERE name = 'Mama Njeri'),
--        CURRENT_DATE, 5.00, 650.00, 'credit', 'regular_customer'
--    );
--    -- balance_owed should now be 2400 + 3250 = 5650
--
-- 3. Insert a payment of 2000 from her:
--    INSERT INTO payments (customer_id, branch_id, payment_date, amount)
--    VALUES (
--        (SELECT id FROM customers WHERE name = 'Mama Njeri'),
--        (SELECT id FROM branches WHERE name = 'Main branch'),
--        CURRENT_DATE, 2000.00
--    );
--    -- balance_owed should now be 5650 - 2000 = 3650
--
-- 4. Recheck: SELECT name, balance_owed FROM customers;
-- ============================================================
