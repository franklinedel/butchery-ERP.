// Single shared connection pool to the Postgres database.
// Every route imports this instead of creating its own connection.
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'butchery',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
});

pool.on('error', (err) => {
    console.error('Unexpected database error:', err.message);
});

module.exports = pool;
