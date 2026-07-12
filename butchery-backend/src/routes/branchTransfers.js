// Branch transfers route.
// Inserting here automatically creates/updates the receiving
// branch's daily_stock row via the trigger from 006_stock_automation.sql.
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// POST /api/branch-transfers
// body: { breakdown_record_id, to_branch_id, weight_sent_kg, transfer_date }
router.post('/', async (req, res) => {
    const { breakdown_record_id, to_branch_id, weight_sent_kg, transfer_date } = req.body;

    if (!breakdown_record_id || !to_branch_id || !weight_sent_kg || !transfer_date) {
        return res.status(400).json({
            error: 'breakdown_record_id, to_branch_id, weight_sent_kg, and transfer_date are all required',
        });
    }
    if (weight_sent_kg <= 0) {
        return res.status(400).json({ error: 'weight_sent_kg must be positive' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO branch_transfers (breakdown_record_id, to_branch_id, weight_sent_kg, transfer_date)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [breakdown_record_id, to_branch_id, weight_sent_kg, transfer_date]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error saving branch transfer:', err.message);
        res.status(500).json({ error: 'Could not save branch transfer' });
    }
});

// GET /api/branch-transfers?breakdown_record_id=1
router.get('/', async (req, res) => {
    const { breakdown_record_id } = req.query;
    try {
        const result = await pool.query(
            `SELECT bt.*, b.name AS to_branch_name
             FROM branch_transfers bt
             JOIN branches b ON b.id = bt.to_branch_id
             WHERE ($1::int IS NULL OR bt.breakdown_record_id = $1)
             ORDER BY bt.transfer_date DESC`,
            [breakdown_record_id || null]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching branch transfers:', err.message);
        res.status(500).json({ error: 'Could not fetch branch transfers' });
    }
});

module.exports = router;