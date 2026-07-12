// Products route. Simple read-only list — prices are fixed and
// rarely change, so no POST endpoint here yet (would be added
// later if your dad needs to update prices through the app
// instead of directly in the database).
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/products
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, price_per_kg, is_byproduct FROM products ORDER BY is_byproduct, name'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching products:', err.message);
        res.status(500).json({ error: 'Could not fetch products' });
    }
});

module.exports = router;