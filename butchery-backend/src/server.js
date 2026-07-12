const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/db');
const branchesRouter = require('./routes/branches');
const productsRouter = require('./routes/products');
const dailyStockRouter = require('./routes/dailyStock');
const salesRouter = require('./routes/sales');
const carcassPurchasesRouter = require('./routes/carcassPurchases');
const breakdownRecordsRouter = require('./routes/breakdownRecords');
const branchTransfersRouter = require('./routes/branchTransfers');
const paymentsRouter = require('./routes/payments');
const expensesRouter = require('./routes/expenses');
const reportsRouter = require('./routes/reports');
const notificationsRouter = require('./routes/notifications');

const app = express();
app.use(cors());
app.use(express.json());

// Health check — confirms both the server AND the database connection
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected', message: err.message });
    }
});

app.use('/api/branches', branchesRouter);
app.use('/api/products', productsRouter);
app.use('/api/daily-stock', dailyStockRouter);
app.use('/api/sales', salesRouter);
app.use('/api/carcass-purchases', carcassPurchasesRouter);
app.use('/api/breakdown-records', breakdownRecordsRouter);
app.use('/api/branch-transfers', branchTransfersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Butchery backend running on http://localhost:${PORT}`);
    console.log(`Try: http://localhost:${PORT}/api/health`);
    console.log(`Try: http://localhost:${PORT}/api/branches`);
});