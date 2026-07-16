// Payments route.
// A payment here automatically decreases the customer's
// balance_owed via the trigger from 004_triggers.sql.
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const requireOwnBranch = require('../middleware/branchAccess');

// POST /api/payments
// body: { customer_id, branch_id, payment_date, amount }
router.post('/', requireOwnBranch('branch_id', 'body'), async (req, res) => {
    const { customer_id, branch_id, payment_date, amount } = req.body;

    if (!customer_id || !branch_id || !payment_date || !amount) {
        return res.status(400).json({
            error: 'customer_id, branch_id, payment_date, and amount are all required',
        });
    }
    if (amount <= 0) {
        return res.status(400).json({ error: 'amount must be positive' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO payments (customer_id, branch_id, payment_date, amount)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [customer_id, branch_id, payment_date, amount]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error saving payment:', err.message);
        res.status(500).json({ error: 'Could not save payment' });
    }
});

// GET /api/payments?customer_id=1
router.get('/', async (req, res) => {
    const { customer_id } = req.query;
    try {
        const result = await pool.query(
            `SELECT p.*, c.name AS customer_name
             FROM payments p
             JOIN customers c ON c.id = p.customer_id
             WHERE ($1::int IS NULL OR p.customer_id = $1)
             ORDER BY p.payment_date DESC`,
            [customer_id || null]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching payments:', err.message);
        res.status(500).json({ error: 'Could not fetch payments' });
    }
});

module.exports = router;