// Branches route.
// Deliberately the FIRST and SIMPLEST route in the project —
// its only job is to prove the API can reach the database
// before we build anything more complex on top.
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/branches — list every branch
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, is_main FROM branches ORDER BY is_main DESC, name'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching branches:', err.message);
        res.status(500).json({ error: 'Could not fetch branches' });
    }
});

module.exports = router;
