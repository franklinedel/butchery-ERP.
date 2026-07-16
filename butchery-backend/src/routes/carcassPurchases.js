// Carcass purchases route.
// This is step one of the main branch's morning screen —
// logging what came in from the slaughterhouse, before it
// gets broken down into sellable products (that's a separate
// route: breakdownRecords.js, added next).
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const requireOwnBranch = require('../middleware/branchAccess');

// POST /api/carcass-purchases
// body: { branch_id, animal_type, invoice_weight_kg, received_weight_kg, cost, purchase_date }
router.post('/', requireOwnBranch('branch_id', 'body'), async (req, res) => {
    const { branch_id, animal_type, invoice_weight_kg, received_weight_kg, cost, purchase_date } = req.body;

    if (!branch_id || !animal_type || !invoice_weight_kg || !received_weight_kg || cost === undefined || !purchase_date) {
        return res.status(400).json({
            error: 'branch_id, animal_type, invoice_weight_kg, received_weight_kg, cost, and purchase_date are all required',
        });
    }
    if (!['beef', 'mutton'].includes(animal_type)) {
        return res.status(400).json({ error: "animal_type must be 'beef' or 'mutton'" });
    }
    if (invoice_weight_kg <= 0 || received_weight_kg <= 0 || cost < 0) {
        return res.status(400).json({ error: 'weights must be positive, cost cannot be negative' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO carcass_purchases
                (branch_id, animal_type, invoice_weight_kg, received_weight_kg, cost, purchase_date)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [branch_id, animal_type, invoice_weight_kg, received_weight_kg, cost, purchase_date]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error saving carcass purchase:', err.message);
        res.status(500).json({ error: 'Could not save carcass purchase' });
    }
});

// GET /api/carcass-purchases?date=2026-07-14
router.get('/', async (req, res) => {
    const { date } = req.query;
    try {
        const result = await pool.query(
            `SELECT cp.*, b.name AS branch_name
             FROM carcass_purchases cp
             JOIN branches b ON b.id = cp.branch_id
             WHERE ($1::date IS NULL OR cp.purchase_date = $1)
             ORDER BY cp.purchase_date DESC, cp.created_at DESC`,
            [date || null]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching carcass purchases:', err.message);
        res.status(500).json({ error: 'Could not fetch carcass purchases' });
    }
});

module.exports = router;