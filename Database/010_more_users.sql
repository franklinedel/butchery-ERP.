-- ============================================================
-- MORE USERS
-- Adds an attendant account for Branch B and Branch C
-- (Main branch already had one from 009_users_auth.sql).
-- Same rule applies: change these test passwords before real use.
--   branch_b_attendant / branchb123
--   branch_c_attendant / branchc123
-- ============================================================

INSERT INTO users (username, password_hash, role, branch_id) VALUES
    ('branch_b_attendant', '$2b$10$qXSFOM5v/AKqiJd7Vf1ise5eazA9gN7bW7KBzZMoFGecexqVOZkWu', 'attendant',
        (SELECT id FROM branches WHERE name = 'Branch B')),
    ('branch_c_attendant', '$2b$10$111x6y18Jc8fRG2W2M9wMucJu9k7cPXLi8Fo1Iq8jfXf.WoahEdsy', 'attendant',
        (SELECT id FROM branches WHERE name = 'Branch C'));

-- ============================================================
-- HOW TO CHANGE ANY PASSWORD LATER (including admin's)
-- There's no "change password" screen yet, so for now this is
-- done directly in pgAdmin, in two steps:
--
-- STEP 1 — generate a new hash for the password you want.
-- In a terminal, inside the butchery-backend folder, run:
--   node -e "console.log(require('bcryptjs').hashSync('yourNewPassword', 10))"
-- This prints a long string starting with $2b$10$... — copy it.
--
-- STEP 2 — paste that hash into an UPDATE statement, e.g.:
--   UPDATE users SET password_hash = 'PASTE_THE_HASH_HERE'
--   WHERE username = 'admin';
-- Run it in pgAdmin. That user can now log in with the new password.
-- ============================================================
