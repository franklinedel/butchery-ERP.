// Sales route.
// A credit sale here will automatically update the customer's
// balance_owed via the trigger from 004_triggers.sql — this
// endpoint does NOT touch that balance itself.
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const requireOwnBranch = require('../middleware/branchesAccess');

// POST /api/sales
// body: { branch_id, product_id, customer_id (optional), sale_date,
//         weight_kg, price_charged, payment_type, discount_reason (optional) }
router.post('/', requireOwnBranch('branch_id', 'body'), async (req, res) => {
    const {
        branch_id, product_id, customer_id, sale_date,
        weight_kg, price_charged, payment_type, discount_reason,
    } = req.body;

    if (!branch_id || !product_id || !sale_date || !weight_kg || price_charged === undefined || !payment_type) {
        return res.status(400).json({
            error: 'branch_id, product_id, sale_date, weight_kg, price_charged, and payment_type are required',
        });
    }
    if (!['cash', 'credit'].includes(payment_type)) {
        return res.status(400).json({ error: "payment_type must be 'cash' or 'credit'" });
    }
    if (payment_type === 'credit' && !customer_id) {
        return res.status(400).json({ error: 'customer_id is required for credit sales' });
    }
    if (weight_kg <= 0 || price_charged < 0) {
        return res.status(400).json({ error: 'weight_kg must be positive, price_charged cannot be negative' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO sales
                (branch_id, product_id, customer_id, sale_date, weight_kg, price_charged, payment_type, discount_reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [branch_id, product_id, customer_id || null, sale_date, weight_kg, price_charged, payment_type, discount_reason || 'none']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error saving sale:', err.message);
        res.status(500).json({ error: 'Could not save sale' });
    }
});

// GET /api/sales?branch_id=1&date=2026-07-14
router.get('/', requireOwnBranch('branch_id', 'query'), async (req, res) => {
    const { branch_id, date } = req.query;
    try {
        const result = await pool.query(
            `SELECT s.*, b.name AS branch_name, p.name AS product_name, c.name AS customer_name
             FROM sales s
             JOIN branches b ON b.id = s.branch_id
             JOIN products p ON p.id = s.product_id
             LEFT JOIN customers c ON c.id = s.customer_id
             WHERE ($1::int IS NULL OR s.branch_id = $1)
               AND ($2::date IS NULL OR s.sale_date = $2)
             ORDER BY s.sale_date DESC, s.created_at DESC`,
            [branch_id || null, date || null]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching sales:', err.message);
        res.status(500).json({ error: 'Could not fetch sales' });
    }
});

module.exports = router;