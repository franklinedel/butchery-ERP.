// Single shared connection pool to the Postgres database.
// Every route imports this instead of creating its own connection.
//
// Supports TWO ways of connecting, so local development (individual
// DB_HOST/DB_USER/etc fields) and cloud hosting like Neon (one
// DATABASE_URL connection string) both work without changing code —
// only .env changes between the two.
const { Pool } = require('pg');
require('dotenv').config();

const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // required by Neon and most cloud Postgres hosts
    })
    : new Pool({
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