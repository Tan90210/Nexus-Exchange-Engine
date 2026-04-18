-- ============================================================
-- Nexus Exchange Engine — EXPLAIN ANALYZE Demo Queries
-- Run these in MySQL Workbench or CLI during the professor demo.
-- ============================================================

USE nexus_db;

-- ─────────────────────────────────────────────────────────────
-- 1. EXPLAIN ANALYZE on the portfolio_mtm view
--    Shows the index scan on holdings + nested-loop join to assets.
--    Demonstrates that the view is not doing full table scans.
-- ─────────────────────────────────────────────────────────────
EXPLAIN ANALYZE
SELECT * FROM portfolio_mtm WHERE user_id = 1;

-- Expected: idx_holdings_user_asset index used on holdings (range scan),
--           then a single-row lookup on assets via PRIMARY key.


-- ─────────────────────────────────────────────────────────────
-- 2. EXPLAIN ANALYZE on price_history lookup
--    Shows composite index (asset_id, recorded_at) being used for range scan.
-- ─────────────────────────────────────────────────────────────
EXPLAIN ANALYZE
SELECT asset_id, price, recorded_at
FROM price_history
WHERE asset_id = 1
  AND recorded_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
ORDER BY recorded_at ASC;

-- Expected: idx_price_history_asset composite index range scan.


-- ─────────────────────────────────────────────────────────────
-- 3. EXPLAIN on findMatchingOrder query (order book matching)
--    The query TradeService calls every time an order is placed.
-- ─────────────────────────────────────────────────────────────
EXPLAIN
SELECT *, (qty - COALESCE(filled_qty, 0)) AS remaining_qty
FROM orders
WHERE asset_id = 1
  AND type = 'SELL'
  AND status = 'OPEN'
  AND (qty - COALESCE(filled_qty, 0)) > 0
ORDER BY limit_price ASC, created_at ASC
LIMIT 1;

-- Expected: idx_orders_asset_status index used (asset_id, status).


-- ─────────────────────────────────────────────────────────────
-- 4. Window function — RANK() OVER() on portfolio values
-- ─────────────────────────────────────────────────────────────
EXPLAIN
SELECT * FROM user_pnl_summary_view;

-- Shows: filesort for window function ranking — expected for RANK().


-- ─────────────────────────────────────────────────────────────
-- 5. Verify audit_log WORM property — no UPDATE/DELETE allowed
--    Run this as nexus_user to confirm access is denied.
-- ─────────────────────────────────────────────────────────────
-- UPDATE audit_log SET tx_hash = 'tampered' WHERE id = 1;
-- Expected: ERROR 1142 (42000): UPDATE command denied to user 'nexus_user'

-- Instead, verify the hash is correct:
SELECT
    al.id,
    al.trade_id,
    al.tx_hash,
    SHA2(CONCAT(t.id,'|',t.asset_id,'|',t.qty,'|',t.executed_price,'|',t.executed_at), 512) AS recomputed_hash,
    (al.tx_hash = SHA2(CONCAT(t.id,'|',t.asset_id,'|',t.qty,'|',t.executed_price,'|',t.executed_at), 512)) AS verified
FROM audit_log al
JOIN trades t ON al.trade_id = t.id;

-- ─────────────────────────────────────────────────────────────
-- 6. Verify InnoDB row locking activity (run during an active trade)
-- ─────────────────────────────────────────────────────────────
SHOW ENGINE INNODB STATUS;

-- Look for TRANSACTION section — shows active locks, waiting threads.
-- Then look for LATEST DETECTED DEADLOCK section (run deadlock_sim.sql first).
