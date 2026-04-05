# ⚡ Nexus Exchange Engine

<div align="center">

**High-Concurrency Digital Asset Exchange — DBMS Group Project**

[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20+%20Vite-61DAFB?logo=react)](https://reactjs.org/)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20+%20Express-339933?logo=node.js)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-MySQL%208%20InnoDB-4479A1?logo=mysql)](https://www.mysql.com/)

</div>

---

## What this is

Nexus Exchange Engine simulates a digital asset exchange where users can buy and sell assets with strict **ACID guarantees**. The core goal is demonstrating that concurrent trades on the same asset pool never cause race conditions, double-spending, or ghost-asset anomalies — even under high load. This is a 10/10 level DBMS demonstration that pushes heavy financial logic directly into the MySQL engine.

---

## Architecture

```
React Dashboard (Vite · port 5173)
         │  HTTP / JSON
         ▼
Express API Gateway (port 3001)
  └── JWT auth · Zod validation · CORS
         │
         ▼
Service Layer
  └── TradeService · OrderService · PortfolioService · UserService · AuditService
         │
         ▼
Data Access Layer
  └── db/pool.js (mysql2 connection pool)
  └── db/queries/*.js
         │  TCP 3306
         ▼
MySQL 8 InnoDB
  └── Stored procedures · Triggers · Views · Row-level locking
```

---

## Key Database Concepts

| Concept | Implementation |
|---------|---------------|
| **ACID transactions** | `execute_trade` and `settle_partial_trade` SPs wrapped in `BEGIN...COMMIT` blocks. |
| **Deadlock prevention** | Canonical lock order approach — always locks the lower `user_id` first. |
| **Row-level locking** | Aggressive usage of `SELECT FOR UPDATE` on wallets + holdings. |
| **WORM audit log** | `AFTER INSERT` trigger writes `SHA2(512)` hash immutably. `BEFORE UPDATE` and `BEFORE DELETE` triggers physically block tampering. |
| **Window Functions** | Native SQL analytics (`RANK() OVER`, `SUM() OVER(PARTITION)`). Includes an advanced unpartitioned `SUM() OVER()` view for global exchange weight. |
| **Partial Fills** | Stateful tracking of `filled_qty` across order executions natively in SQL. |
| **Double-Entry Ledgers**| Both fully matched trades and standalone `deposit/withdraw` ops hit the immutable `ledger_entries` table. |
| **Constraints** | `CHECK (balance >= 0)`, `CHECK (quantity >= 0)`, and physical `FOREIGN KEY` bounds safely. |
| **Isolation level** | `REPEATABLE READ` (InnoDB default). |
| **Normalization** | Third Normal Form (3NF). |

---

## Advanced Database Entities

### Stored Procedures (`server/sql/stored_procedures/`)
- `execute_trade`: Matches exact P2P trades with atomic DB constraints.
- `settle_partial_trade`: Fills split quantifies securely and keeps remainder OPEN.
- `cancel_order`: Refunds reserved cash or assets with compensating ledger entries.
- `deposit_funds` / `withdraw_funds`: Safe, atomic standalone ops.
- `get_order_book`: Pulls active Limit orders out with strict `ORDER BY limit_price ASC/DESC, created_at ASC` priority logic. 

### Views (`server/sql/views/`)
- `portfolio_mtm`: Realtime MTM valuation for active holdings.
- `user_pnl_summary_view`: Live aggregation over PnL grouping with `RANK() OVER()`.
- `user_trade_summary_view`: Generates complex statistics using **correlated subqueries**.
- `running_balance_view`: Rolling wallet trajectories computed via `SUM() OVER(PARTITION)`. 
- `user_exchange_weight_view`: Global capital distribution against all users via an **unpartitioned** `SUM() OVER()`.
- `open_orders_view` & `asset_volume_view` & `wac_view`.

### Triggers (`server/sql/triggers/`)
- `audit_log_trigger`: Auto-hashes trade parameters via `SHA2` on `INSERT`.
- `prevent_audit_tampering`: Rejects `UPDATE`/`DELETE` via `SQLSTATE 45000` to enforce immutability.
- `price_history_trigger`: Auto-scrapes tracking data to history after price mutations.

---

## Codebase Structure

```
nexus/
├── client/                          # React frontend
│   └── src/
│       ├── pages/                   # Login, Dashboard
│       └── components/              # HoldingsTable, PriceChart, OrderForm, AuditFeed, AdminView
└── server/
    ├── index.js                     # Express entry (port 3001)
    ├── routes/                      # REST endpoints (auth, trades, orders, portfolio, admin)
    ├── services/                    # Business orchestration logic 
    ├── db/                          # MySQL pool + parameterized queries
    ├── middleware/                  # JWT and Zod layers
    └── sql/
        ├── migrations/              # Incremental database updates
        ├── stored_procedures/       # Atomicity logic
        ├── triggers/                # Security and automation logic
        └── views/                   # Read-heavy analytic logic
```

---

## Running Locally

```bash
# 1. Start MySQL (macOS)
brew services start mysql

# 2. Load schema, seed data, and new features 
mysql -u root -p < server/sql/schema.sql
mysql -u root -p nexus_db < server/sql/seed.sql
mysql -u root -p nexus_db < server/sql/migrations/003_update_stored_proc.sql
mysql -u root -p nexus_db < server/sql/migrations/005_new_features.sql
# Ensure you source all the triggers, views, and stored procedure files as well!

# 3. Backend — configure .env first
cd server && npm install && npm run dev

# 4. Frontend
cd client && npm install && npm run dev
```

**`server/.env` and `client/.env`**
```
DB_HOST=192.168.1.100
DB_PORT=3306
DB_USER=nexus_user
DB_PASS=nexus_pass
DB_NAME=nexus_db
JWT_SECRET=your_secret_here
PORT=3001
VITE_API_URL=http://localhost:3001
```

Open **http://localhost:5173**

---

<div align="center">

Built for the DBMS course · University Project · 2025–26

</div>
