# ⚡ Nexus Exchange Engine

<div align="center">

**High-Concurrency Digital Asset Exchange — DBMS Group Project**

[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20+%20Vite-61DAFB?logo=react)](https://reactjs.org/)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20+%20Express-339933?logo=node.js)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-MySQL%208%20InnoDB-4479A1?logo=mysql)](https://www.mysql.com/)

</div>

---

## What this is

Nexus Exchange Engine simulates a digital asset exchange where users can buy and sell assets with strict **ACID guarantees**. The core goal is demonstrating that concurrent trades on the same asset pool never cause race conditions, double-spending, or ghost-asset anomalies — even under high load.

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
  └── TradeService · PortfolioService · UserService · AuditService
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
| ACID transactions | `execute_trade` stored procedure with `BEGIN...COMMIT` |
| Deadlock prevention | Canonical lock order — always lock lower `user_id` first |
| Row-level locking | `SELECT FOR UPDATE` on wallets + holdings |
| WORM audit log | `AFTER INSERT` trigger writes `SHA2(512)` hash immutably |
| MTM valuation | `portfolio_mtm` view — joins holdings × live asset prices |
| WAC costing | `wac_view` — weighted average cost across buy events |
| Constraints | `CHECK (balance >= 0)` · `CHECK (quantity >= 0)` |
| Isolation level | `REPEATABLE READ` (InnoDB default) |
| Normalization | Third Normal Form (3NF) |

---

## Codebase Structure

```
nexus/
├── client/                          # React frontend
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── api/axios.js             # Axios instance with JWT interceptor
│       ├── context/AuthContext.jsx  # Auth state + login/logout
│       ├── mock/data.js             # Mock data matching API shapes
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   └── DashboardPage.jsx
│       └── components/
│           ├── TopBar.jsx           # Fixed header
│           ├── TabNav.jsx           # Trader / Admin tab switch
│           ├── StatCard.jsx         # Reusable metric card
│           ├── PortfolioSummaryBar.jsx
│           ├── HoldingsTable.jsx    # Sortable with P&L badges
│           ├── PriceChart.jsx       # Recharts line chart
│           ├── OrderForm.jsx        # BUY/SELL · MARKET/LIMIT
│           ├── OrderPreview.jsx     # Live cost/proceeds calc
│           ├── TradeHistoryLog.jsx  # Paginated ledger entries
│           ├── AuditFeed.jsx        # Live audit feed with tx hashes
│           └── AdminView.jsx        # Locks · health · audit
│
└── server/
    ├── index.js                     # Express entry (port 3001)
    ├── routes/
    │   ├── auth.js                  # /api/auth/login · /register
    │   ├── trades.js                # /api/trades
    │   ├── portfolio.js             # /api/portfolio · /history
    │   └── audit.js                 # /api/audit
    ├── services/
    │   ├── TradeService.js
    │   ├── PortfolioService.js
    │   ├── UserService.js
    │   └── AuditService.js
    ├── db/
    │   ├── pool.js                  # mysql2 connection pool
    │   └── queries/                 # SQL wrappers per domain
    ├── middleware/
    │   ├── verifyJWT.js
    │   └── errorHandler.js
    └── sql/
        ├── schema.sql
        ├── seed.sql
        ├── stored_procedures/
        │   └── execute_trade.sql
        ├── triggers/
        │   └── audit_log_trigger.sql
        └── views/
            ├── portfolio_mtm.sql
            └── wac_view.sql
```

---

## Running Locally

```bash
# 1. Start MySQL (macOS)
brew services start mysql

# 2. Load schema + seed data
mysql -u root -p < server/sql/schema.sql
mysql -u root -p nexus_db < server/sql/seed.sql

# 3. Backend — create server/.env first (see below)
cd server && npm install && npm run dev

# 4. Frontend
cd client && npm install && npm run dev
```

**`server/.env`**
```
DB_HOST=192.168.1.100
DB_PORT=3306
DB_USER=nexus_user
DB_PASS=nexus_pass
DB_NAME=nexus_db
JWT_SECRET=your_secret_here
PORT=3001
```

Open **http://localhost:5173**

---

<div align="center">

Built for the DBMS course · University Project · 2025–26

</div>
