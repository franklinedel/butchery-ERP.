-- ============================================================
-- USERS AND AUTHENTICATION
-- Two roles:
--   'admin'     — sees everything, all branches (your dad)
--   'attendant' — tied to exactly one branch_id, can only work
--                 within that branch
-- Passwords are stored as bcrypt hashes, never plain text.
-- ============================================================

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50) NOT NULL UNIQUE,
    password_hash   VARCHAR(100) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'attendant')),
    branch_id       INTEGER REFERENCES branches(id),  -- NULL for admin, required for attendant
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (role = 'admin' AND branch_id IS NULL) OR
        (role = 'attendant' AND branch_id IS NOT NULL)
    )
);

-- ------------------------------------------------------------
-- Seed accounts for testing.
-- IMPORTANT: change these passwords before real use — these are
-- only here so login can be tested immediately.
--   admin / admin123
--   main_attendant / attendant123  (tied to Main branch)
-- ------------------------------------------------------------
INSERT INTO users (username, password_hash, role, branch_id) VALUES
    ('admin', '$2b$10$/VEJ/PqwRbnoXJF9XQTBFeXgJfSckEvezxXAKwmwmgB0w018lvtuK', 'admin', NULL),
    ('main_attendant', '$2b$10$2WaZxZ32jHuzS4uGnljLqu1zQq7EPmcORKznPjTBNKC3JPvB0ksCW', 'attendant',
        (SELECT id FROM branches WHERE name = 'Main branch'));
