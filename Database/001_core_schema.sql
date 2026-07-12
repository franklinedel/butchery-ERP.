-- ============================================================
-- BUTCHERY MANAGEMENT SYSTEM — CORE SCHEMA
-- Built directly from the agreed wireframes:
--   1. Daily closing entry screen (branch level)
--   2. Main branch breakdown + allocation screen
--   3. Branch report / dashboard
-- Every table below maps to a field you already saw on screen.
-- No table or column name here is guessed.
-- ============================================================

-- ------------------------------------------------------------
-- PART A — Branches
-- ------------------------------------------------------------
CREATE TABLE branches (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    is_main     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Exactly one branch may be the main/central branch
CREATE UNIQUE INDEX one_main_branch ON branches (is_main) WHERE is_main = TRUE;

-- ------------------------------------------------------------
-- PART B — Products (sellable outputs, fixed pricing)
-- ------------------------------------------------------------
CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,   -- Beef cuts, Mutton, Matumbo, Liver, Bones, Fat
    price_per_kg    NUMERIC(10,2) NOT NULL CHECK (price_per_kg >= 0),
    is_byproduct    BOOLEAN NOT NULL DEFAULT FALSE, -- true for matumbo/liver/bones/fat
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- PART C — Carcass purchases (main branch only, from slaughterhouse)
-- ------------------------------------------------------------
CREATE TABLE carcass_purchases (
    id                  SERIAL PRIMARY KEY,
    branch_id           INTEGER NOT NULL REFERENCES branches(id),
    animal_type         VARCHAR(20) NOT NULL CHECK (animal_type IN ('beef','mutton')),
    invoice_weight_kg   NUMERIC(8,2) NOT NULL CHECK (invoice_weight_kg > 0),
    received_weight_kg  NUMERIC(8,2) NOT NULL CHECK (received_weight_kg > 0),
    cost                NUMERIC(12,2) NOT NULL CHECK (cost >= 0),
    purchase_date       DATE NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- PART D — Breakdown records (what came out of a carcass)
-- expected_yield_pct lets the system flag abnormal cutting loss
-- ------------------------------------------------------------
CREATE TABLE breakdown_records (
    id                  SERIAL PRIMARY KEY,
    carcass_purchase_id INTEGER NOT NULL REFERENCES carcass_purchases(id),
    product_id          INTEGER NOT NULL REFERENCES products(id),
    output_weight_kg    NUMERIC(8,2) NOT NULL CHECK (output_weight_kg >= 0),
    expected_yield_pct  NUMERIC(5,2) NOT NULL CHECK (expected_yield_pct >= 0),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (carcass_purchase_id, product_id)
);

-- ------------------------------------------------------------
-- PART E — Branch transfers (main branch splits output to B and C)
-- ------------------------------------------------------------
CREATE TABLE branch_transfers (
    id                  SERIAL PRIMARY KEY,
    breakdown_record_id INTEGER NOT NULL REFERENCES breakdown_records(id),
    to_branch_id        INTEGER NOT NULL REFERENCES branches(id),
    weight_sent_kg      NUMERIC(8,2) NOT NULL CHECK (weight_sent_kg >= 0),
    transfer_date       DATE NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- PART F — Customers (for credit / deni tracking)
-- ------------------------------------------------------------
CREATE TABLE customers (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    customer_type   VARCHAR(20) NOT NULL DEFAULT 'individual'
                        CHECK (customer_type IN ('individual','school','hotel')),
    phone           VARCHAR(20),
    balance_owed    NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- PART G — Daily stock (the closing entry screen, per branch/product/day)
-- ------------------------------------------------------------
CREATE TABLE daily_stock (
    id              SERIAL PRIMARY KEY,
    branch_id       INTEGER NOT NULL REFERENCES branches(id),
    product_id      INTEGER NOT NULL REFERENCES products(id),
    stock_date      DATE NOT NULL,
    opening_kg      NUMERIC(8,2) NOT NULL DEFAULT 0,
    received_kg     NUMERIC(8,2) NOT NULL DEFAULT 0,
    closing_kg      NUMERIC(8,2) NOT NULL DEFAULT 0,  -- physically weighed at night
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (branch_id, product_id, stock_date)
);

-- ------------------------------------------------------------
-- PART H — Sales (cash, credit, and discounted sales)
-- ------------------------------------------------------------
CREATE TABLE sales (
    id              SERIAL PRIMARY KEY,
    branch_id       INTEGER NOT NULL REFERENCES branches(id),
    product_id      INTEGER NOT NULL REFERENCES products(id),
    customer_id     INTEGER REFERENCES customers(id),  -- null for anonymous cash sales
    sale_date       DATE NOT NULL,
    weight_kg       NUMERIC(8,2) NOT NULL CHECK (weight_kg > 0),
    price_charged   NUMERIC(10,2) NOT NULL CHECK (price_charged >= 0), -- per kg, may differ from products.price_per_kg
    payment_type    VARCHAR(10) NOT NULL CHECK (payment_type IN ('cash','credit')),
    discount_reason VARCHAR(30) CHECK (discount_reason IN
                        ('none','regular_customer','school_hotel','weekly_promo_day')),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- PART I — Payments against a customer's credit balance
-- ------------------------------------------------------------
CREATE TABLE payments (
    id              SERIAL PRIMARY KEY,
    customer_id     INTEGER NOT NULL REFERENCES customers(id),
    branch_id       INTEGER NOT NULL REFERENCES branches(id),
    payment_date    DATE NOT NULL,
    amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- PART J — Expenses (free-form, per branch)
-- ------------------------------------------------------------
CREATE TABLE expenses (
    id              SERIAL PRIMARY KEY,
    branch_id       INTEGER NOT NULL REFERENCES branches(id),
    expense_date    DATE NOT NULL,
    description     VARCHAR(200) NOT NULL,
    amount          NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- PART K — Profit targets (per branch, per period)
-- ------------------------------------------------------------
CREATE TABLE profit_targets (
    id              SERIAL PRIMARY KEY,
    branch_id       INTEGER NOT NULL REFERENCES branches(id),
    period_type     VARCHAR(10) NOT NULL CHECK (period_type IN ('daily','weekly','monthly')),
    period_start    DATE NOT NULL,
    target_amount   NUMERIC(12,2) NOT NULL CHECK (target_amount >= 0),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (branch_id, period_type, period_start)
);

-- ============================================================
-- No triggers or functions yet — those come in 010_functions.sql
-- once this file has been executed successfully and confirmed
-- to match your actual pgAdmin structure.
-- ============================================================
