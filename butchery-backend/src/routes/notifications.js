// Notifications route — the alerts list.
// Alerts themselves are generated in the database (007/008 files),
// this just reads and lets the app mark them as read.
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/notifications?is_read=false&branch_id=1
router.get('/', async (req, res) => {
    const { is_read, branch_id } = req.query;
    try {
        const result = await pool.query(
            `SELECT n.*, b.name AS branch_name, c.name AS customer_name
             FROM notifications n
             LEFT JOIN branches b ON b.id = n.branch_id
             LEFT JOIN customers c ON c.id = n.customer_id
             WHERE ($1::boolean IS NULL OR n.is_read = $1)
               AND ($2::int IS NULL OR n.branch_id = $2)
             ORDER BY n.created_at DESC`,
            [is_read === undefined ? null : is_read === 'true', branch_id || null]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching notifications:', err.message);
        res.status(500).json({ error: 'Could not fetch notifications' });
    }
});

// PATCH /api/notifications/:id/read — mark a single alert as read
router.patch('/:id/read', async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating notification:', err.message);
        res.status(500).json({ error: 'Could not update notification' });
    }
});

module.exports = router;