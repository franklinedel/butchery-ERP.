// Daily stock (closing entry) route.
// Matches the closing entry wireframe: an attendant only ever
// needs to submit closing_kg (the physical night count).
// opening_kg and received_kg are filled by database triggers
// (006_stock_automation.sql), never by this endpoint directly.
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const requireOwnBranch = require('../middleware/branchesAccess');

// POST /api/daily-stock
// body: { branch_id, product_id, stock_date, closing_kg }
router.post('/', requireOwnBranch('branch_id', 'body'), async (req, res) => {
    const { branch_id, product_id, stock_date, closing_kg } = req.body;

    if (!branch_id || !product_id || !stock_date || closing_kg === undefined) {
        return res.status(400).json({
            error: 'branch_id, product_id, stock_date, and closing_kg are all required',
        });
    }
    if (isNaN(closing_kg) || closing_kg < 0) {
        return res.status(400).json({ error: 'closing_kg must be a positive number' });
    }

    try {
        // ON CONFLICT: if a transfer already created this day's row
        // (received_kg populated), only closing_kg gets updated —
        // opening_kg and received_kg are left exactly as the
        // triggers set them.
        const result = await pool.query(
            `INSERT INTO daily_stock (branch_id, product_id, stock_date, opening_kg, closing_kg)
             VALUES ($1, $2, $3, NULL, $4)
             ON CONFLICT (branch_id, product_id, stock_date)
             DO UPDATE SET closing_kg = EXCLUDED.closing_kg
             RETURNING *`,
            [branch_id, product_id, stock_date, closing_kg]
        );
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error saving daily stock:', err.message);
        res.status(500).json({ error: 'Could not save daily stock entry' });
    }
});

// GET /api/daily-stock?date=2026-07-12&branch_id=1
// Convenience route to check what's been entered for a given day
router.get('/', requireOwnBranch('branch_id', 'query'), async (req, res) => {
    const { date, branch_id } = req.query;
    try {
        const result = await pool.query(
            `SELECT ds.*, b.name AS branch_name, p.name AS product_name
             FROM daily_stock ds
             JOIN branches b ON b.id = ds.branch_id
             JOIN products p ON p.id = ds.product_id
             WHERE ($1::date IS NULL OR ds.stock_date = $1)
               AND ($2::int IS NULL OR ds.branch_id = $2)
             ORDER BY ds.stock_date DESC, p.name`,
            [date || null, branch_id || null]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching daily stock:', err.message);
        res.status(500).json({ error: 'Could not fetch daily stock' });
    }
});

module.exports = router;