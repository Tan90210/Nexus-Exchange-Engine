# AGENTS.md — Nexus Exchange Engine

This file gives Codex full context about the Nexus Exchange Engine project. Read this before assisting with any part of the codebase.

---

## What this project is

Nexus Exchange Engine is a high-concurrency financial ledger built as a university DBMS group project. It simulates a digital asset exchange where users can buy and sell assets with strict ACID guarantees. The core academic goal is demonstrating that concurrent trades on the same limited asset pool never cause race conditions, double-spending, or ghost-asset anomalies — even under high load.

The project has two deliverables:
- A MySQL database with stored procedures, triggers, views, and concurrency controls
- A React + Tailwind dashboard that visualizes the portfolio, executes trades, and displays the audit log

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, Recharts |
| Backend | Node.js, Express.js |
| Database | MySQL 8 (InnoDB engine) |
| Auth | JWT (jsonwebtoken + bcrypt) |
| Validation | Zod |
| DB driver | mysql2/promise (connection pool) |

---

## Architecture

The project uses a **layered REST API** architecture with four distinct layers. A request flows top to bottom through each layer and the response travels back up.

```
React (Vite, port 5173)
        │  HTTP/JSON
        ▼
Express API gateway (port 3001)
  └── JWT middleware
  └── Zod request validation
  └── CORS
  └── Error handler
        │
        ▼
Service layer (business logic)
  └── TradeService.js
  └── PortfolioService.js
  └── UserService.js
  └── AuditService.js
        │
        ▼
Data access layer
  └── db/pool.js  (mysql2 connection pool)
  └── db/queries/*.js  (raw SQL / stored proc wrappers)
        │  TCP port 3306
        ▼
MySQL InnoDB (hosted on local network, static IP)
  └── Stored procedures
  └── Triggers
  └── Views
  └── Check constraints
  └── Row-level locking (SELECT FOR UPDATE)
```

---

## Database setup

MySQL runs on one team member's laptop on the local network with a static IP. All other team members connect to it via the shared `.env` file. No cloud database is used.

Every team member has this `.env` in their `server/` directory (never committed to git):

```
DB_HOST=192.168.1.100
DB_PORT=3306
DB_USER=nexus_user
DB_PASS=nexus_pass
DB_NAME=nexus_db
JWT_SECRET=some_long_random_secret
PORT=3001
```

The `server/db/pool.js` file reads from these env vars:

```js
import 'dotenv/config';
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT),
  user:               process.env.DB_USER,
  password:           process.env.DB_PASS,
  database:           process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
});
```

---

## Folder structure

```
nexus/
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/
│       │   └── axios.js              # base axios instance with JWT header
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   └── DashboardPage.jsx
│       └── components/
│           ├── TopBar.jsx
│           ├── TabNav.jsx
│           ├── StatCard.jsx
│           ├── PortfolioSummaryBar.jsx
│           ├── HoldingsTable.jsx
│           ├── PriceChart.jsx
│           ├── OrderForm.jsx
│           ├── OrderPreview.jsx
│           ├── TradeHistoryLog.jsx
│           ├── AuditFeed.jsx
│           └── AdminView.jsx
│
└── server/
    ├── index.js                      # Express entry point
    ├── routes/
    │   ├── auth.js                   # POST /api/auth/login, /register
    │   ├── trades.js                 # POST /api/trades
    │   ├── portfolio.js              # GET /api/portfolio, /api/portfolio/history
    │   └── audit.js                  # GET /api/audit
    ├── services/
    │   ├── UserService.js
    │   ├── TradeService.js
    │   ├── PortfolioService.js
    │   └── AuditService.js
    ├── db/
    │   ├── pool.js
    │   └── queries/
    │       ├── users.js
    │       ├── trades.js
    │       ├── portfolio.js
    │       └── audit.js
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

## API contract

These are the agreed endpoints. Do not change method, URL, or response shape without updating this file.

### Auth

**POST** `/api/auth/register`
```json
// request
{ "email": "string", "password": "string", "name": "string" }
// response 200
{ "token": "string", "user": { "id": 1, "email": "string", "name": "string" } }
```

**POST** `/api/auth/login`
```json
// request
{ "email": "string", "password": "string" }
// response 200
{ "token": "string", "user": { "id": 1, "email": "string", "name": "string" } }
```

### Trades

**POST** `/api/trades`
```json
// request (JWT required)
{
  "assetId": 1,
  "type": "BUY" | "SELL",
  "qty": 10,
  "orderType": "MARKET" | "LIMIT",
  "limitPrice": 2500
}
// response 200
{
  "tradeId": 42,
  "status": "COMMITTED",
  "executedPrice": 2581.50,
  "totalValue": 25815
}
// response 409 — constraint violation or insufficient funds
{ "error": "INSUFFICIENT_FUNDS" | "INSUFFICIENT_HOLDINGS" }
// response 503 — deadlock detected, client should retry after delay
{ "error": "DEADLOCK_DETECTED", "retryAfter": 500 }
```

### Portfolio

**GET** `/api/portfolio`
```json
// response (JWT required)
{
  "cashBalance": 91500,
  "totalMtm": 482340,
  "unrealizedPnl": 22840,
  "dailyChange": 1.73,
  "holdings": [
    {
      "assetId": 1,
      "symbol": "RELI",
      "name": "Reliance Industries",
      "qty": 120,
      "avgCostBasis": 2410.00,
      "currentPrice": 2581.50,
      "marketValue": 309780,
      "unrealizedPnl": 20580,
      "pnlPct": 7.11
    }
  ]
}
```

**GET** `/api/portfolio/history?assetId=1&range=7d`
```json
// response
{
  "assetId": 1,
  "symbol": "RELI",
  "prices": [
    { "date": "2025-03-01", "price": 2450.00 }
  ]
}
```

### Audit

**GET** `/api/audit?page=1&limit=20`
```json
// response (JWT required)
{
  "total": 142,
  "entries": [
    {
      "id": 1,
      "timestamp": "2025-03-23T14:32:08.441Z",
      "tradeId": 42,
      "userId": 7,
      "side": "BUY",
      "assetSymbol": "RELI",
      "qty": 50,
      "price": 2577.00,
      "txHash": "0xa3f9...e821",
      "verified": true
    }
  ]
}
```

---

## Database schema overview

### Core tables

**`users`** — registered users with hashed passwords
- `id`, `email`, `password_hash`, `name`, `created_at`

**`wallets`** — one cash wallet per user
- `id`, `user_id` (FK → users), `balance` CHECK (balance >= 0), `updated_at`

**`assets`** — master list of tradeable instruments
- `id`, `symbol`, `name`, `current_price`, `updated_at`

**`holdings`** — how much of each asset a user owns
- `id`, `user_id` (FK → users), `asset_id` (FK → assets), `quantity` CHECK (quantity >= 0), `avg_cost_basis`, `updated_at`

**`orders`** — intent to trade, placed by a user
- `id`, `user_id` (FK), `asset_id` (FK), `type` (BUY/SELL), `order_type` (MARKET/LIMIT), `qty`, `limit_price`, `status` (OPEN/FILLED/CANCELLED), `created_at`

**`trades`** — matched executions linking two orders
- `id`, `buy_order_id` (FK → orders), `sell_order_id` (FK → orders), `asset_id` (FK), `qty`, `executed_price`, `executed_at`

**`ledger_entries`** — double-entry bookkeeping rows, immutable once written
- `id`, `trade_id` (FK → trades), `user_id` (FK), `entry_type` (DEBIT/CREDIT), `amount`, `asset_id`, `created_at`

**`price_history`** — time-series of asset prices
- `id`, `asset_id` (FK → assets), `price`, `recorded_at`

**`audit_log`** — WORM append-only table, never updated or deleted
- `id`, `trade_id` (FK → trades), `tx_hash` (SHA2 of the trade row), `created_at`

### Normalization

The schema is in **Third Normal Form (3NF)**:
- No repeating groups (1NF)
- Every non-key column depends on the whole primary key (2NF)
- No transitive dependencies — e.g. asset name and price live in `assets`, not duplicated in `holdings` or `trades` (3NF)

---

## Key database concepts demonstrated

### ACID transaction — execute_trade stored procedure

The single most important piece of the project. Called via:
```sql
CALL execute_trade(buyerId, sellerId, assetId, qty, executedPrice);
```

Sequence inside the procedure:
1. `BEGIN`
2. `SELECT ... FOR UPDATE` on both users' wallet rows and the relevant holdings rows — acquires exclusive row-level locks
3. Validate: buyer cash >= total cost, seller holdings >= qty (check constraints also fire here)
4. `UPDATE wallets` — debit buyer cash, credit seller cash
5. `UPDATE holdings` — transfer asset qty, recalculate buyer's avg cost basis
6. `INSERT INTO ledger_entries` — two rows (one DEBIT, one CREDIT)
7. `INSERT INTO trades` — one row recording the execution
8. `COMMIT`

If any step fails → `ROLLBACK`. The entire sequence is undone. The database returns to exactly its pre-trade state.

### Deadlock prevention

Locks are always acquired in a canonical order: **lower user_id first**. This prevents the classic A↔B deadlock where user 1 locks their wallet waiting for user 2's wallet, while user 2 simultaneously locks their wallet waiting for user 1's. By always going low-to-high, both transactions acquire locks in the same order and one simply waits for the other rather than deadlocking.

A deadlock simulation script (`server/sql/deadlock_sim.sql`) intentionally creates a deadlock using two sessions to demonstrate MySQL's deadlock detector resolving it. Run `SHOW ENGINE INNODB STATUS` to see the detection output.

### Audit trigger

An `AFTER INSERT` trigger on `trades` automatically writes a `SHA2(512)` hash of the new trade row into `audit_log`. This makes the WORM property automatic and tamper-evident — no application code can skip it, and any modification to a committed trade row would produce a different hash.

### Views

**`portfolio_mtm`** — joins `holdings` with `assets.current_price` to produce real-time mark-to-market valuation and unrealized P&L per holding per user:
```sql
SELECT
  h.user_id,
  h.asset_id,
  h.quantity * a.current_price        AS market_value,
  h.quantity * h.avg_cost_basis       AS book_value,
  (h.quantity * a.current_price)
    - (h.quantity * h.avg_cost_basis) AS unrealized_pnl
FROM holdings h
JOIN assets a ON h.asset_id = a.id;
```

**`wac_view`** — calculates weighted average cost basis across multiple buy events for the same asset per user.

### Isolation level

`REPEATABLE READ` (MySQL InnoDB default). Prevents dirty reads and non-repeatable reads. The `SELECT FOR UPDATE` inside `execute_trade` escalates to a full exclusive lock on the affected rows for the duration of the transaction, preventing phantom reads on those rows.

### Check constraints (MySQL 8.0+)

```sql
ALTER TABLE wallets  ADD CONSTRAINT chk_balance  CHECK (balance  >= 0);
ALTER TABLE holdings ADD CONSTRAINT chk_quantity CHECK (quantity >= 0);
```

These fire at the database level before any rollback logic runs — a second line of defence against negative balances or over-selling.

### Non-destructive architecture

Trades are never deleted. Instead a reversing entry is inserted into `ledger_entries` to offset the original — maintaining a perfect, unbroken audit trail. The `audit_log` table has no `UPDATE` or `DELETE` privileges granted to `nexus_user`.

---

## Frontend overview

The dashboard has two views accessible via tabs: Trader View and Admin/Monitor View.

### Trader view components

| Component | What it shows | Data source |
|-----------|--------------|-------------|
| `PortfolioSummaryBar` | 4 stat cards: MTM value, cash, unrealized P&L, daily change % | `GET /api/portfolio` |
| `HoldingsTable` | Sortable table: asset, qty, avg cost, current price, market value, P&L %, P&L pill badge | `GET /api/portfolio` |
| `PriceChart` | Recharts LineChart of price history for selected asset | `GET /api/portfolio/history` |
| `OrderForm` | Buy/Sell toggle, Market/Limit selector, quantity input | Posts to `POST /api/trades` |
| `OrderPreview` | Live debit/credit calculation before submission | Computed client-side from form state |
| `TradeHistoryLog` | Paginated ledger entries with tx hash | `GET /api/audit` |

### Admin / monitor view components

| Component | What it shows |
|-----------|--------------|
| `AdminView` | Active locks, system health (throughput, deadlock count, rollback rate), audit feed |
| `AuditFeed` | Append-only scrolling feed of `audit_log` with verified checkmarks and tx hashes |

### Aesthetic direction

Dark terminal-style theme. IBM Plex Mono for numbers, hashes, and monospaced labels. DM Sans for UI text and headings. Color semantics: green for positive P&L / success, red for negative P&L / errors, blue for asset symbols and info, amber for warnings and active locks. No gradients. No drop shadows. Clean flat surfaces with thin 1px borders.

### Mock data pattern

While the backend is being built, all components use mock data that exactly matches the API contract shapes defined above. Swapping to real API calls is done by changing only the data source — component logic and props do not change.

Example mock swap in `HoldingsTable.jsx`:
```js
// mock (during development)
const { data } = { data: mockPortfolio };

// real (after backend is ready)
const { data } = useQuery('portfolio', () => api.get('/api/portfolio'));
```

---

## Frontend axios setup

`client/src/api/axios.js`:
```js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexus_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

`client/.env`:
```
VITE_API_URL=http://localhost:3001
```

---

## Running the project

### Start the database (on the host laptop only)
```bash
# macOS
brew services start mysql

# Windows — MySQL runs as a background service automatically after install
```

### Start the backend
```bash
cd server
npm install
npm run dev        # nodemon index.js — restarts on file change, port 3001
```

### Start the frontend
```bash
cd client
npm install
npm run dev        # Vite dev server with HMR, port 5173
```

Open `http://localhost:5173` in the browser. API calls proxy to `http://localhost:3001`.

---

## Git conventions

- `main` is always demo-ready. Never push broken code directly to main.
- Work on feature branches: `feature/schema`, `feature/trade-execution`, `feature/portfolio`, `feature/audit`, `feature/frontend`
- Open a pull request to merge into main. At least one other person reviews.
- **Never commit `.env` files.** The `.gitignore` must include `.env` and `node_modules/`.
- Schema changes go in `server/sql/` as numbered migration files: `001_initial_schema.sql`, `002_add_price_history.sql`, etc. Announce in the group chat whenever a new migration file is added — everyone needs to run it against the shared DB.

---

## Demo script (what to show the professor)

1. Open the dashboard — show the portfolio summary bar updating from the DB via the MTM view
2. Open two browser windows as two different users
3. Both users attempt to buy the last available shares of the same asset simultaneously
4. Show that exactly one trade succeeds and the other gets a 409 or retries — no double-spend
5. Show the audit log — both attempts are recorded with their tx hashes
6. Run `SHOW ENGINE INNODB STATUS` in MySQL Workbench — show the lock activity
7. Run the deadlock simulation script — show MySQL detecting and resolving it automatically
8. Run `EXPLAIN ANALYZE` on the MTM view query — show the index being used

---

## What to say when the professor asks hard questions

**"What was the hardest part?"**
The deadlock prevention logic in `execute_trade`. We had to enforce a canonical lock-acquisition order — always lock the lower user_id first — to prevent the scenario where user A and user B simultaneously try to trade with each other and each waits on the other's lock indefinitely. We wrote a simulation script to prove it works.

**"What happens if the server crashes mid-transaction?"**
InnoDB automatically rolls back any uncommitted transaction on restart. The ACID durability guarantee means committed transactions survive crashes via the write-ahead log. No manual recovery is needed.

**"Why not just use application-level locking?"**
Application-level locks don't survive crashes, don't work across multiple server processes, and can't enforce atomicity with the database writes in the same unit of work. Row-level locking inside a stored procedure ties the lock lifecycle directly to the transaction — locks are released on COMMIT or ROLLBACK, atomically.

**"Why stored procedures instead of ORM queries?"**
Because an ORM cannot guarantee that the five steps of a trade execute as a single atomic unit without very careful transaction management. The stored procedure wraps the entire sequence in one `BEGIN...COMMIT` block that executes inside MySQL. The application layer only calls `CALL execute_trade()` and handles the result. This also means the locking logic lives in one place and cannot be accidentally bypassed by any application code.

**"What does REPEATABLE READ actually prevent?"**
It prevents dirty reads (reading uncommitted data from another transaction) and non-repeatable reads (getting a different value if you read the same row twice in one transaction). Combined with `SELECT FOR UPDATE`, it also prevents phantom reads on the locked rows for the duration of the trade transaction.

**"What is the WORM table and why does it matter?"**
WORM stands for Write-Once-Read-Many. The `audit_log` table is populated only by a database trigger — the application user `nexus_user` has no `UPDATE` or `DELETE` privileges on it. This means the audit trail cannot be altered by application code, even accidentally. Every committed trade has an immutable SHA2 hash record that can be independently verified.
