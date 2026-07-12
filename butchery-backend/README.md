# Butchery Backend

Minimal, tested-one-piece-at-a-time API for the butchery management system.
Sits on top of the schema already built in `001` through `008` — it does not
duplicate any calculation logic. All financial and stock math stays in the
database as triggers/views; this backend only exposes it.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Copy the environment template and fill in your real database details:
   ```
   cp .env.example .env
   ```
   Edit `.env` with your actual Postgres host/port/database/user/password
   (the same ones you use to connect in pgAdmin).

3. Start the server:
   ```
   npm start
   ```

## Test it (in this order)

1. **Health check** — confirms the server is running AND can reach the database:
   ```
   http://localhost:4000/api/health
   ```
   Expected: `{"status":"ok","database":"connected"}`

   If this fails, check your `.env` values first — that's almost always the cause.

2. **Branches list** — confirms a real query against your schema works:
   ```
   http://localhost:4000/api/branches
   ```
   Expected: your three branches (Main branch, Branch B, Branch C), main branch first.

Only once both of these work should more routes be added. Same discipline as
the SQL files: one piece, tested, before the next.

## What's next (not built yet)

- `POST /api/sales` — record a sale (cash or credit)
- `POST /api/daily-stock` — closing entry (opening/received auto-filled by DB triggers, closing entered manually)
- `POST /api/carcass-purchases` + `POST /api/breakdown-records` — main branch morning screen
- `GET /api/reports/branch/:id` — pulls from `daily_branch_profit` and `branch_target_progress`
- `GET /api/notifications` — pulls from the `notifications` table
- Authentication (JWT, matching your EasyBizz project's approach)
