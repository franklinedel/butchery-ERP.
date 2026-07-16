// Auth route — the only endpoint that doesn't require a token
// (you need to log in before you can have one).
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// POST /api/auth/login
// body: { username, password }
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'username and password are required' });
    }

    try {
        const result = await pool.query(
            `SELECT u.id, u.username, u.password_hash, u.role, u.branch_id, b.name AS branch_name
             FROM users u
             LEFT JOIN branches b ON b.id = u.branch_id
             WHERE u.username = $1`,
            [username]
        );
        const user = result.rows[0];

        // Deliberately vague error message either way — never reveal
        // whether it was the username or the password that was wrong.
        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, branch_id: user.branch_id },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                branch_id: user.branch_id,
                branch_name: user.branch_name,
            },
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;