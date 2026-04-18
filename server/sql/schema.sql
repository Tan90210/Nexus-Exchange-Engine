DROP DATABASE IF EXISTS nexus_db;
CREATE DATABASE nexus_db;
USE nexus_db;

-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('USER', 'ADMIN') DEFAULT 'USER',   -- migration 002
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 2. wallets
-- ============================================================
CREATE TABLE wallets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0 CHECK (balance >= 0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================================
-- 3. assets
-- ============================================================
CREATE TABLE assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    current_price DECIMAL(15, 2) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 4. holdings
-- ============================================================
CREATE TABLE holdings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    asset_id INT NOT NULL,
    quantity DECIMAL(15, 4) NOT NULL CHECK (quantity >= 0),
    avg_cost_basis DECIMAL(15, 2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_holdings_user_asset UNIQUE (user_id, asset_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (asset_id) REFERENCES assets(id)
) ENGINE=InnoDB;

-- ============================================================
-- 5. orders  (includes filled_qty from migration 005)
-- ============================================================
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    asset_id INT NOT NULL,
    type ENUM('BUY', 'SELL') NOT NULL,
    order_type ENUM('MARKET', 'LIMIT') NOT NULL,
    qty DECIMAL(15, 4) NOT NULL,
    filled_qty DECIMAL(15, 4) NOT NULL DEFAULT 0,  -- migration 005
    reserved_cash DECIMAL(15, 2) NOT NULL DEFAULT 0,
    reserved_qty DECIMAL(15, 4) NOT NULL DEFAULT 0,
    limit_price DECIMAL(15, 2) NULL,
    status ENUM('OPEN', 'FILLED', 'CANCELLED') DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (asset_id) REFERENCES assets(id)
) ENGINE=InnoDB;

-- ============================================================
-- 6. trades
-- ============================================================
CREATE TABLE trades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    buy_order_id INT NULL,
    sell_order_id INT NULL,
    asset_id INT NOT NULL,
    qty DECIMAL(15, 4) NOT NULL,
    executed_price DECIMAL(15, 2) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buy_order_id) REFERENCES orders(id),
    FOREIGN KEY (sell_order_id) REFERENCES orders(id),
    FOREIGN KEY (asset_id) REFERENCES assets(id)
) ENGINE=InnoDB;

-- ============================================================
-- 7. ledger_entries  (trade_id nullable from migration 005 — supports deposits/withdrawals)
-- ============================================================
CREATE TABLE ledger_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trade_id INT NULL,                              -- migration 005: nullable for deposit/withdraw
    user_id INT NOT NULL,
    entry_type ENUM('DEBIT', 'CREDIT') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    asset_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trade_id) REFERENCES trades(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (asset_id) REFERENCES assets(id)
) ENGINE=InnoDB;

-- ============================================================
-- 8. price_history
-- ============================================================
CREATE TABLE price_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id)
) ENGINE=InnoDB;

-- ============================================================
-- 9. audit_log  (WORM — write-once-read-many via triggers)
-- ============================================================
CREATE TABLE audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trade_id INT NOT NULL,
    tx_hash VARCHAR(130) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_audit_trade (trade_id),
    FOREIGN KEY (trade_id) REFERENCES trades(id)
) ENGINE=InnoDB;

-- ============================================================
-- Indexes
-- ============================================================
CREATE UNIQUE INDEX idx_holdings_user_asset ON holdings(user_id, asset_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_asset_status ON orders(asset_id, status);
CREATE INDEX idx_trades_asset ON trades(asset_id);
CREATE INDEX idx_ledger_trade ON ledger_entries(trade_id);
CREATE INDEX idx_price_history_asset ON price_history(asset_id, recorded_at);
