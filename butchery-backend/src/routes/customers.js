// Customers route.
// GET /api/customers          — everyone with a balance, for the credit accounts list
// GET /api/customers/:id/statement — full itemized record for one customer:
//   every credit sale (with branch, product, date, amount) and every
//   payment, in order — this is what schools/hotels can be shown as
//   their invoice/statement.
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.post('/', async (req, res) => {
    const { name, customer_type, phone, credit_limit } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'name is required' });
    }
    if (customer_type && !['individual', 'school', 'hotel'].includes(customer_type)) {
        return res.status(400).json({ error: "customer_type must be 'individual', 'school', or 'hotel'" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO customers (name, customer_type, phone, credit_limit)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, customer_type, phone, balance_owed, credit_limit`,
            [name, customer_type || 'individual', phone || null, credit_limit || 3000]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating customer:', err.message);
        res.status(500).json({ error: 'Could not create customer' });
    }
});

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, customer_type, phone, balance_owed, credit_limit
             FROM customers
             ORDER BY balance_owed DESC, name`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching customers:', err.message);
        res.status(500).json({ error: 'Could not fetch customers' });
    }
});

router.get('/:id/statement', async (req, res) => {
    const customerId = req.params.id;
    try {
        const [customerResult, salesResult, paymentsResult] = await Promise.all([
            pool.query('SELECT id, name, customer_type, phone, balance_owed, credit_limit FROM customers WHERE id = $1', [customerId]),
            pool.query(
                `SELECT s.id, s.sale_date AS date, b.name AS branch_name, p.name AS product_name,
                        s.weight_kg, s.price_charged, (s.weight_kg * s.price_charged) AS amount
                 FROM sales s
                 JOIN branches b ON b.id = s.branch_id
                 JOIN products p ON p.id = s.product_id
                 WHERE s.customer_id = $1 AND s.payment_type = 'credit'
                 ORDER BY s.sale_date, s.created_at`,
                [customerId]
            ),
            pool.query(
                `SELECT id, payment_date AS date, amount
                 FROM payments
                 WHERE customer_id = $1
                 ORDER BY payment_date, created_at`,
                [customerId]
            ),
        ]);

        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Merge sales (charges) and payments (credits) into one
        // chronological ledger with a running balance — this is the
        // actual "statement" a school or hotel would want to see.
        const charges = salesResult.rows.map((s) => ({
            type: 'charge', date: s.date, description: `${s.product_name} — ${s.weight_kg}kg @ ${s.price_charged} (${s.branch_name})`,
            amount: Number(s.amount),
        }));
        const credits = paymentsResult.rows.map((p) => ({
            type: 'payment', date: p.date, description: 'Payment received', amount: -Number(p.amount),
        }));
        const ledger = [...charges, ...credits].sort((a, b) => new Date(a.date) - new Date(b.date));

        let running = 0;
        const ledgerWithBalance = ledger.map((entry) => {
            running += entry.amount;
            return { ...entry, running_balance: running };
        });

        res.json({
            customer: customerResult.rows[0],
            ledger: ledgerWithBalance,
        });
    } catch (err) {
        console.error('Error building customer statement:', err.message);
        res.status(500).json({ error: 'Could not build customer statement' });
    }
});

module.exports = router;