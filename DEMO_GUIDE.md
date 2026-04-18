# Nexus Exchange Engine — Demo Guide

## Login Credentials (all passwords: `password123`)

| User | Email | Role |
|------|-------|------|
| Arjun Mehta | arjun@nexus.io | **ADMIN** |
| Priya Sharma | priya@nexus.io | USER |
| Rohan Das | rohan@nexus.io | USER |
| Kavya Nair | kavya@nexus.io | USER |

---

## Setup (run once before demo)

```bash
# 1. Start MySQL
brew services start mysql

# 2. Load schema + seed (in MySQL Workbench or CLI)
mysql -u root -p < server/sql/schema.sql
mysql -u root -p nexus_db < server/sql/stored_procedures/execute_trade.sql
mysql -u root -p nexus_db < server/sql/stored_procedures/settle_partial_trade.sql
mysql -u root -p nexus_db < server/sql/stored_procedures/cancel_order.sql
mysql -u root -p nexus_db < server/sql/stored_procedures/deposit_funds.sql
mysql -u root -p nexus_db < server/sql/stored_procedures/withdraw_funds.sql
mysql -u root -p nexus_db < server/sql/stored_procedures/get_order_book.sql
mysql -u root -p nexus_db < server/sql/views/portfolio_mtm.sql
mysql -u root -p nexus_db < server/sql/views/wac_view.sql
mysql -u root -p nexus_db < server/sql/views/asset_volume_view.sql
mysql -u root -p nexus_db < server/sql/views/open_orders_view.sql
mysql -u root -p nexus_db < server/sql/views/user_pnl_summary_view.sql
mysql -u root -p nexus_db < server/sql/views/user_trade_summary_view.sql
mysql -u root -p nexus_db < server/sql/views/user_exchange_weight_view.sql
mysql -u root -p nexus_db < server/sql/views/running_balance_view.sql
mysql -u root -p nexus_db < server/sql/triggers/audit_log_trigger.sql
mysql -u root -p nexus_db < server/sql/triggers/prevent_audit_tampering.sql
mysql -u root -p nexus_db < server/sql/triggers/price_history_trigger.sql
mysql -u root -p nexus_db < server/sql/seed.sql

# 3. Start backend
cd server && npm run dev

# 4. Start frontend (new terminal)
cd client && npm run dev
# Open http://localhost:5173
```

---

## Demo Flow

### Scene 1 — Portfolio Dashboard (2 min)

1. Log in as **Arjun** (`arjun@nexus.io`)
2. Point to the 4 stat cards — **MTM Value, Cash, Unrealized P&L, Daily Change**
   > "These are backed by the `portfolio_mtm` view — a SQL view that joins `holdings` with live `assets.current_price` to compute valuation in real time."
3. Click any asset row in the Holdings table
   > "The price chart pulls from `price_history` using a composite index on `(asset_id, recorded_at)`."

---

### Scene 2 — Live Trade Execution + ACID Demo (5 min)

**Part A — Single successful trade**

1. Still as Arjun, in the Order Form:
   - Asset: **RELI**, Side: **BUY**, Type: **MARKET**, Qty: **5**
   - Click **Place Order**
2. Confirm response shows `status: FILLED` and `executedPrice`
3. Watch Holdings table refresh — Arjun's RELI qty increases, cash decreases
   > "This called `CALL execute_trade(...)` — a stored procedure that wraps 8 steps atomically:
   > SELECT FOR UPDATE → validate → UPDATE wallets → UPDATE holdings → INSERT trades → INSERT ledger_entries → COMMIT."

**Part B — Concurrent trade ACID test (the core demo)**

1. Open a second browser window / incognito tab
2. In **Window 1**: Log in as **Priya** (`priya@nexus.io`)
3. In **Window 2**: Log in as **Rohan** (`rohan@nexus.io`)
4. Seed data has Priya with a SELL RELI OPEN order (20 shares) — only one buyer can get them
5. Simultaneously:
   - **Window 1 (Priya)**: Place BUY RELI MARKET 15 → click Place Order
   - **Window 2 (Rohan)**: Place BUY RELI MARKET 15 → click Place Order  
   *(Click both within 1-2 seconds)*
6. **Expected result**: One gets `FILLED`, the other gets `OPEN` (no match left) or `PARTIALLY_FILLED`
   > "The stored procedure uses `SELECT FOR UPDATE` with canonical lock ordering — lower user_id locks first. InnoDB guarantees exactly one transaction wins; no double-spend is possible."

---

### Scene 3 — Deadlock Simulation (3 min)

1. Open MySQL Workbench — connect to the DB
2. Open `server/sql/scripts/deadlock_sim.sql`
3. Follow the step-by-step instructions in the file using **two query tabs**
4. After step 6, run:
   ```sql
   SHOW ENGINE INNODB STATUS;
   ```
5. Scroll to `LATEST DETECTED DEADLOCK` section
   > "MySQL's deadlock detector identified the circular wait and automatically chose a victim transaction to roll back. Our `execute_trade` procedure avoids this in production by always locking the lower user_id first."

---

### Scene 4 — EXPLAIN ANALYZE (2 min)

Open `server/sql/scripts/explain_analyze.sql` in MySQL Workbench and run each query:

1. **Query 1** — `EXPLAIN ANALYZE` on `portfolio_mtm WHERE user_id = 1`
   > "Index range scan on `idx_holdings_user_asset` — O(log n), not a full table scan."
2. **Query 2** — `EXPLAIN ANALYZE` on `price_history`
   > "Composite index `(asset_id, recorded_at)` is used for the date range — exactly what we designed."
3. **Query 5** — Audit hash verification
   > "We recompute SHA2(512) of the trade row and compare to the stored hash — any tampering would show `verified = 0`."

---

### Scene 5 — Analytics Views (2 min)

1. Click the **DB ANALYTICS** tab
2. Point to each section:
   - **User P&L Rankings** → `RANK() OVER(ORDER BY portfolio_value DESC)` window function
   - **Exchange Capital Distribution** → unpartitioned `SUM() OVER()` — each user's share of total exchange value
   - **Asset Trading Volume** → `GROUP BY` aggregation with `COUNT` and `SUM`
   - **User Trade Statistics** → correlated subquery for most-traded asset per user
   - **Weighted Average Cost (WAC)** → `wac_view` — avg cost basis calculation across buy events
   > "All five analytics views use advanced SQL — no application-layer calculation."

---

### Scene 6 — Admin Panel (2 min)

1. Log in as **Arjun** (the ADMIN badge appears in the top bar)
2. Click **ADMIN / MONITOR** tab (only visible to admins)
3. **Asset Price Updater**:
   - Select RELI, enter a new price (e.g. 2650), click Update
   - Confirm success message: *"price_history_trigger fired ✓"*
   - Switch to Trader View → price chart has a new data point
   > "The trigger fires automatically on `AFTER UPDATE` of `assets.current_price` — the application layer has no explicit code for this."
4. **Running Wallet Balance**:
   - Select different users from the dropdown
   - Show the ledger entry timeline with running totals
   > "This uses `SUM() OVER(PARTITION BY user_id ORDER BY created_at)` — the window function accumulates balance changes chronologically."
5. **Fund Management**:
   - Deposit ₹50,000 to Priya (user 2)
   - Confirm the `deposit_funds` stored procedure is called — wallet atomically updated

---

### Scene 7 — WORM Audit Trail (1 min)

1. In **Audit Feed** (Admin panel), show the append-only log with SHA2 hashes
2. In MySQL Workbench, attempt:
   ```sql
   UPDATE audit_log SET tx_hash = 'hacked' WHERE id = 1;
   ```
   > "Should error — `nexus_user` has no UPDATE privilege on `audit_log`. The trigger writes records, the application can only read them."

---

## Q&A Cheat Sheet

**"What was hardest?"**
> Canonical lock ordering in `execute_trade` — always locking lower `user_id` first prevents the A↔B deadlock where two sessions each wait on the other's wallet lock. We wrote `deadlock_sim.sql` to prove it.

**"What if the server crashes mid-trade?"**
> InnoDB rolls back any uncommitted transaction on restart via the write-ahead log. The ACID durability guarantee means committed trades survive crashes, uncommitted ones vanish cleanly.

**"Why stored procedures over ORM?"**
> An ORM can't guarantee atomicity across 8 operations without careful explicit transaction management. The stored procedure wraps everything in one `BEGIN...COMMIT` — the application just calls `CALL execute_trade()` and handles the result.

**"What is REPEATABLE READ + SELECT FOR UPDATE?"**
> REPEATABLE READ prevents dirty reads and non-repeatable reads. `SELECT FOR UPDATE` escalates to an exclusive row lock for the duration of the transaction — no other session can modify that wallet or holding row until COMMIT.

**"What is the WORM table?"**
> Write-Once-Read-Many. `audit_log` is populated only by an `AFTER INSERT` trigger on `trades`. `nexus_user` has no UPDATE or DELETE on it. Every trade generates an immutable SHA2(512) hash record.
