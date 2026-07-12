// Breakdown records route.
// Matches the breakdown screen: several products come out of
// ONE carcass purchase at once, so this accepts a list and
// saves them together as a single transaction — either all
// rows save, or none do, so a partial breakdown can never be
// half-recorded if something fails partway through.
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// POST /api/breakdown-records
// body: { carcass_purchase_id, items: [{ product_id, output_weight_kg, expected_yield_pct }, ...] }
router.post('/', async (req, res) => {
    const { carcass_purchase_id, items } = req.body;

    if (!carcass_purchase_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            error: 'carcass_purchase_id and a non-empty items array are required',
        });
    }
    for (const item of items) {
        if (!item.product_id || item.output_weight_kg === undefined || item.expected_yield_pct === undefined) {
            return res.status(400).json({
                error: 'each item needs product_id, output_weight_kg, and expected_yield_pct',
            });
        }
        if (item.output_weight_kg < 0) {
            return res.status(400).json({ error: 'output_weight_kg cannot be negative' });
        }
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const saved = [];
        for (const item of items) {
            const result = await client.query(
                `INSERT INTO breakdown_records (carcass_purchase_id, product_id, output_weight_kg, expected_yield_pct)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [carcass_purchase_id, item.product_id, item.output_weight_kg, item.expected_yield_pct]
            );
            saved.push(result.rows[0]);
        }
        await client.query('COMMIT');
        res.status(201).json(saved);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error saving breakdown records:', err.message);
        res.status(500).json({ error: 'Could not save breakdown records — none were saved' });
    } finally {
        client.release();
    }
});

// GET /api/breakdown-records?carcass_purchase_id=2
router.get('/', async (req, res) => {
    const { carcass_purchase_id } = req.query;
    try {
        const result = await pool.query(
            `SELECT br.*, p.name AS product_name
             FROM breakdown_records br
             JOIN products p ON p.id = br.product_id
             WHERE ($1::int IS NULL OR br.carcass_purchase_id = $1)
             ORDER BY br.carcass_purchase_id DESC, p.name`,
            [carcass_purchase_id || null]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching breakdown records:', err.message);
        res.status(500).json({ error: 'Could not fetch breakdown records' });
    }
});

module.exports = router;