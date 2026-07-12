// Expenses route. Free-form, per branch — matches the requirement
// that expense types shouldn't be locked into a fixed list.
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// POST /api/expenses
// body: { branch_id, expense_date, description, amount }
router.post('/', async (req, res) => {
    const { branch_id, expense_date, description, amount } = req.body;

    if (!branch_id || !expense_date || !description || amount === undefined) {
        return res.status(400).json({
            error: 'branch_id, expense_date, description, and amount are all required',
        });
    }
    if (amount < 0) {
        return res.status(400).json({ error: 'amount cannot be negative' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO expenses (branch_id, expense_date, description, amount)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [branch_id, expense_date, description, amount]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error saving expense:', err.message);
        res.status(500).json({ error: 'Could not save expense' });
    }
});

// GET /api/expenses?branch_id=1&date=2026-07-14
router.get('/', async (req, res) => {
    const { branch_id, date } = req.query;
    try {
        const result = await pool.query(
            `SELECT e.*, b.name AS branch_name
             FROM expenses e
             JOIN branches b ON b.id = e.branch_id
             WHERE ($1::int IS NULL OR e.branch_id = $1)
               AND ($2::date IS NULL OR e.expense_date = $2)
             ORDER BY e.expense_date DESC`,
            [branch_id || null, date || null]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching expenses:', err.message);
        res.status(500).json({ error: 'Could not fetch expenses' });
    }
});

module.exports = router;