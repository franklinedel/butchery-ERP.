-- ============================================================
-- SEED DATA — for testing the schema and upcoming views
-- Matches the numbers used in the wireframes we designed.
-- Safe to delete and re-run: no ON CONFLICT needed since this
-- runs once against an empty schema.
-- ============================================================

-- PART A — Branches
INSERT INTO branches (name, is_main) VALUES
    ('Main branch', TRUE),
    ('Branch B', FALSE),
    ('Branch C', FALSE);

-- PART B — Products
INSERT INTO products (name, price_per_kg, is_byproduct) VALUES
    ('Beef cuts', 650.00, FALSE),
    ('Mutton',    750.00, FALSE),
    ('Matumbo',   300.00, TRUE),
    ('Liver',     500.00, TRUE),
    ('Bones',     150.00, TRUE),
    ('Fat',       200.00, TRUE);

-- PART C — One carcass purchase at the main branch
INSERT INTO carcass_purchases (branch_id, animal_type, invoice_weight_kg, received_weight_kg, cost, purchase_date)
VALUES (
    (SELECT id FROM branches WHERE is_main = TRUE),
    'beef', 180.00, 176.00, 65000.00, CURRENT_DATE
);

-- PART D — Breakdown of that carcass into products
-- (expected_yield_pct is against received_weight_kg = 176kg)
INSERT INTO breakdown_records (carcass_purchase_id, product_id, output_weight_kg, expected_yield_pct)
SELECT cp.id, p.id, v.output_kg, v.expected_pct
FROM carcass_purchases cp
CROSS JOIN (VALUES
    ('Beef cuts', 97.00, 55.00),
    ('Bones',     24.00, 12.00),
    ('Fat',       22.00, 10.00),
    ('Matumbo',   10.00,  6.00),
    ('Liver',      5.00,  3.00)
) AS v(product_name, output_kg, expected_pct)
JOIN products p ON p.name = v.product_name
WHERE cp.animal_type = 'beef'
ORDER BY cp.id DESC
LIMIT 5;

-- PART E — Allocation of that breakdown to branches
INSERT INTO branch_transfers (breakdown_record_id, to_branch_id, weight_sent_kg, transfer_date)
SELECT br.id, b.id, v.weight_sent_kg, CURRENT_DATE
FROM breakdown_records br
JOIN products p ON p.id = br.product_id AND p.name = 'Beef cuts'
CROSS JOIN (VALUES
    ('Main branch', 40.00),
    ('Branch B',    30.00),
    ('Branch C',    27.00)
) AS v(branch_name, weight_sent_kg)
JOIN branches b ON b.name = v.branch_name;

-- PART F — A customer for credit tracking
INSERT INTO customers (name, customer_type, phone, balance_owed) VALUES
    ('Mama Njeri', 'individual', '0712345678', 0);

-- PART G — Daily stock at the main branch (matches the closing entry wireframe)
INSERT INTO daily_stock (branch_id, product_id, stock_date, opening_kg, received_kg, closing_kg)
SELECT
    (SELECT id FROM branches WHERE name = 'Main branch'),
    p.id, CURRENT_DATE, v.opening, v.received, v.closing
FROM (VALUES
    ('Beef cuts', 12.00, 40.00, 9.00),
    ('Mutton',     6.00, 20.00, 4.00),
    ('Matumbo',    2.00,  8.00, 1.00),
    ('Liver',      1.00,  5.00, 1.00),
    ('Bones',      3.00, 12.00, 3.00),
    ('Fat',        2.00,  7.00, 2.00)
) AS v(product_name, opening, received, closing)
JOIN products p ON p.name = v.product_name;

-- PART H — Sales at the main branch (cash + one credit sale, matches wireframe)
INSERT INTO sales (branch_id, product_id, customer_id, sale_date, weight_kg, price_charged, payment_type, discount_reason)
SELECT
    (SELECT id FROM branches WHERE name = 'Main branch'),
    p.id, v.customer_id, CURRENT_DATE, v.weight_kg, v.price_charged, v.payment_type, v.discount_reason
FROM (VALUES
    ('Beef cuts', NULL::INTEGER, 38.00, 650.00, 'cash',   'none'),
    ('Mutton',    NULL::INTEGER, 19.00, 750.00, 'cash',   'none'),
    ('Matumbo',   NULL::INTEGER,  9.00, 300.00, 'cash',   'none')
) AS v(product_name, customer_id, weight_kg, price_charged, payment_type, discount_reason)
JOIN products p ON p.name = v.product_name;

-- Credit sale to Mama Njeri (4kg beef, regular customer discount)
INSERT INTO sales (branch_id, product_id, customer_id, sale_date, weight_kg, price_charged, payment_type, discount_reason)
VALUES (
    (SELECT id FROM branches WHERE name = 'Main branch'),
    (SELECT id FROM products WHERE name = 'Beef cuts'),
    (SELECT id FROM customers WHERE name = 'Mama Njeri'),
    CURRENT_DATE, 4.00, 600.00, 'credit', 'regular_customer'
);

-- Update her balance to reflect that credit sale
UPDATE customers SET balance_owed = 4.00 * 600.00 WHERE name = 'Mama Njeri';

-- PART I — One expense at the main branch
INSERT INTO expenses (branch_id, expense_date, description, amount) VALUES (
    (SELECT id FROM branches WHERE name = 'Main branch'),
    CURRENT_DATE, 'Transport from main branch', 500.00
);

-- PART J — Profit target for the main branch, this week
INSERT INTO profit_targets (branch_id, period_type, period_start, target_amount) VALUES (
    (SELECT id FROM branches WHERE name = 'Main branch'),
    'weekly', DATE_TRUNC('week', CURRENT_DATE)::DATE, 48000.00
);
