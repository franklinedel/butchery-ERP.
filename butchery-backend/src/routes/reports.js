// Reports route — the dashboard payoff screen.
// Pulls from the views already tested in the database (003 and 005),
// does not recalculate anything itself.
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const requireOwnBranch = require('../middleware/branchAccess');

// GET /api/reports/branch/:id?date=2026-07-14
router.get('/branch/:id', requireOwnBranch('id', 'params'), async (req, res) => {
    const branchId = req.params.id;
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    try {
        const [profitResult, varianceResult, targetResult] = await Promise.all([
            pool.query(
                `SELECT * FROM daily_branch_profit
                 WHERE branch_name = (SELECT name FROM branches WHERE id = $1)
                   AND report_date = $2`,
                [branchId, date]
            ),
            pool.query(
                `SELECT * FROM daily_stock_variance
                 WHERE branch_name = (SELECT name FROM branches WHERE id = $1)
                   AND stock_date = $2
                 ORDER BY product_name`,
                [branchId, date]
            ),
            pool.query(
                `SELECT * FROM branch_target_progress
                 WHERE branch_name = (SELECT name FROM branches WHERE id = $1)
                 ORDER BY period_start DESC`,
                [branchId]
            ),
        ]);

        res.json({
            branch_id: Number(branchId),
            report_date: date,
            profit: profitResult.rows[0] || null,
            stock_variance: varianceResult.rows,
            targets: targetResult.rows,
        });
    } catch (err) {
        console.error('Error building report:', err.message);
        res.status(500).json({ error: 'Could not build report' });
    }
});

// GET /api/reports/comparison — all branches side by side, for the
// "which branch is doing better" view
router.get('/comparison', async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can view the branch comparison' });
    }
    try {
        const result = await pool.query(
            `SELECT branch_name, period_type, period_start, target_amount, actual_profit, pct_of_target
             FROM branch_target_progress
             ORDER BY period_start DESC, pct_of_target DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error building comparison report:', err.message);
        res.status(500).json({ error: 'Could not build comparison report' });
    }
});

module.exports = router;