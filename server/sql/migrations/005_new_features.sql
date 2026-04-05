-- Migration 005: New Features
-- Adds filled_qty to orders and makes ledger_entries.trade_id nullable
USE nexus_db;

-- 1. Add filled_qty column to orders (tracks partial fills)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS
    filled_qty DECIMAL(15, 4) NOT NULL DEFAULT 0;

-- 2. Make ledger_entries.trade_id nullable to support deposit/withdrawal entries
ALTER TABLE ledger_entries MODIFY COLUMN trade_id INT NULL;

-- 3. Enforce NOT NULL on order IDs in trades table, as claimed in the report
ALTER TABLE trades MODIFY COLUMN buy_order_id INT NOT NULL;
ALTER TABLE trades MODIFY COLUMN sell_order_id INT NOT NULL;
