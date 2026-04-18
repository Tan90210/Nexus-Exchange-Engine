USE nexus_db;

-- 1. Insert Assets
INSERT INTO assets (id, symbol, name, current_price) VALUES
(1, 'RELI', 'Reliance Industries', 2581.50),
(2, 'TCS', 'Tata Consultancy Services', 3905.75),
(3, 'INFY', 'Infosys Ltd', 1623.40),
(4, 'HDFC', 'HDFC Bank', 1612.80),
(5, 'WIPRO', 'Wipro Ltd', 472.15);

-- 2. Insert Users (Password: "password123")
-- Arjun is the ADMIN user — can access the Admin panel on the dashboard.
INSERT INTO users (id, name, email, password_hash, role) VALUES
(1, 'Arjun Mehta', 'arjun@nexus.io', '$2b$10$NHKib.ZllJl68Zat1zJqKOMQSIa2j2/SIlaDqoKelH4epiGXEYzoC', 'ADMIN'),
(2, 'Priya Sharma', 'priya@nexus.io', '$2b$10$NHKib.ZllJl68Zat1zJqKOMQSIa2j2/SIlaDqoKelH4epiGXEYzoC', 'USER'),
(3, 'Rohan Das', 'rohan@nexus.io', '$2b$10$NHKib.ZllJl68Zat1zJqKOMQSIa2j2/SIlaDqoKelH4epiGXEYzoC', 'USER'),
(4, 'Kavya Nair', 'kavya@nexus.io', '$2b$10$NHKib.ZllJl68Zat1zJqKOMQSIa2j2/SIlaDqoKelH4epiGXEYzoC', 'USER');

-- 3. Insert Wallets
INSERT INTO wallets (user_id, balance) VALUES
(1, 91500.00),
(2, 150000.00),
(3, 75000.00),
(4, 200000.00);

-- 4. Insert Holdings

-- Arjun (user 1): RELI 130 (includes seeded BUY trade of 10), TCS 40 (avg 3720), INFY 60 (avg 1690), HDFC 30 (avg 1540), WIPRO 80 (avg 498)
INSERT INTO holdings (user_id, asset_id, quantity, avg_cost_basis) VALUES
(1, 1, 130, 2423.19),
(1, 2, 40, 3720.00),
(1, 3, 60, 1690.00),
(1, 4, 30, 1540.00),
(1, 5, 80, 498.00);

-- Priya (user 2): RELI 50 (avg 2500), TCS 15 (after seeded SELL trade of 5)
INSERT INTO holdings (user_id, asset_id, quantity, avg_cost_basis) VALUES
(2, 1, 50, 2500.00),
(2, 2, 15, 3800.00);

-- Rohan (user 3): INFY 112 (includes seeded BUY trade of 12), WIPRO 200 (avg 490)
INSERT INTO holdings (user_id, asset_id, quantity, avg_cost_basis) VALUES
(3, 3, 112, 1691.79),
(3, 5, 200, 490.00);

-- Kavya (user 4): HDFC 80 (avg 1600), TCS 30 (avg 3900), WIPRO 100 (avg 465) — backs open SELL order 8
INSERT INTO holdings (user_id, asset_id, quantity, avg_cost_basis) VALUES
(4, 4, 80, 1600.00),
(4, 2, 30, 3900.00),
(4, 5, 100, 465.00);

-- 5. Insert Price History (Simulating past 14 days)

-- Asset 1: RELI (Current: 2581.50)
INSERT INTO price_history (asset_id, price, recorded_at) VALUES
(1, 2470.00, DATE_SUB(CURDATE(), INTERVAL 14 DAY)),
(1, 2480.00, DATE_SUB(CURDATE(), INTERVAL 13 DAY)),
(1, 2475.00, DATE_SUB(CURDATE(), INTERVAL 12 DAY)),
(1, 2490.00, DATE_SUB(CURDATE(), INTERVAL 11 DAY)),
(1, 2510.00, DATE_SUB(CURDATE(), INTERVAL 10 DAY)),
(1, 2520.00, DATE_SUB(CURDATE(), INTERVAL 9 DAY)),
(1, 2515.00, DATE_SUB(CURDATE(), INTERVAL 8 DAY)),
(1, 2530.00, DATE_SUB(CURDATE(), INTERVAL 7 DAY)),
(1, 2550.00, DATE_SUB(CURDATE(), INTERVAL 6 DAY)),
(1, 2540.00, DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
(1, 2560.00, DATE_SUB(CURDATE(), INTERVAL 4 DAY)),
(1, 2575.00, DATE_SUB(CURDATE(), INTERVAL 3 DAY)),
(1, 2570.00, DATE_SUB(CURDATE(), INTERVAL 2 DAY)),
(1, 2581.50, DATE_SUB(CURDATE(), INTERVAL 1 DAY));

-- Asset 2: TCS (Current: 3905.75)
INSERT INTO price_history (asset_id, price, recorded_at) VALUES
(2, 3790.00, DATE_SUB(CURDATE(), INTERVAL 14 DAY)),
(2, 3810.00, DATE_SUB(CURDATE(), INTERVAL 13 DAY)),
(2, 3805.00, DATE_SUB(CURDATE(), INTERVAL 12 DAY)),
(2, 3820.00, DATE_SUB(CURDATE(), INTERVAL 11 DAY)),
(2, 3830.00, DATE_SUB(CURDATE(), INTERVAL 10 DAY)),
(2, 3850.00, DATE_SUB(CURDATE(), INTERVAL 9 DAY)),
(2, 3840.00, DATE_SUB(CURDATE(), INTERVAL 8 DAY)),
(2, 3860.00, DATE_SUB(CURDATE(), INTERVAL 7 DAY)),
(2, 3880.00, DATE_SUB(CURDATE(), INTERVAL 6 DAY)),
(2, 3870.00, DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
(2, 3890.00, DATE_SUB(CURDATE(), INTERVAL 4 DAY)),
(2, 3900.00, DATE_SUB(CURDATE(), INTERVAL 3 DAY)),
(2, 3895.00, DATE_SUB(CURDATE(), INTERVAL 2 DAY)),
(2, 3905.75, DATE_SUB(CURDATE(), INTERVAL 1 DAY));

-- Asset 3: INFY (Current: 1623.40)
INSERT INTO price_history (asset_id, price, recorded_at) VALUES
(3, 1530.00, DATE_SUB(CURDATE(), INTERVAL 14 DAY)),
(3, 1540.00, DATE_SUB(CURDATE(), INTERVAL 13 DAY)),
(3, 1535.00, DATE_SUB(CURDATE(), INTERVAL 12 DAY)),
(3, 1550.00, DATE_SUB(CURDATE(), INTERVAL 11 DAY)),
(3, 1560.00, DATE_SUB(CURDATE(), INTERVAL 10 DAY)),
(3, 1575.00, DATE_SUB(CURDATE(), INTERVAL 9 DAY)),
(3, 1565.00, DATE_SUB(CURDATE(), INTERVAL 8 DAY)),
(3, 1580.00, DATE_SUB(CURDATE(), INTERVAL 7 DAY)),
(3, 1600.00, DATE_SUB(CURDATE(), INTERVAL 6 DAY)),
(3, 1590.00, DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
(3, 1610.00, DATE_SUB(CURDATE(), INTERVAL 4 DAY)),
(3, 1620.00, DATE_SUB(CURDATE(), INTERVAL 3 DAY)),
(3, 1615.00, DATE_SUB(CURDATE(), INTERVAL 2 DAY)),
(3, 1623.40, DATE_SUB(CURDATE(), INTERVAL 1 DAY));

-- Asset 4: HDFC (Current: 1612.80)
INSERT INTO price_history (asset_id, price, recorded_at) VALUES
(4, 1520.00, DATE_SUB(CURDATE(), INTERVAL 14 DAY)),
(4, 1530.00, DATE_SUB(CURDATE(), INTERVAL 13 DAY)),
(4, 1525.00, DATE_SUB(CURDATE(), INTERVAL 12 DAY)),
(4, 1540.00, DATE_SUB(CURDATE(), INTERVAL 11 DAY)),
(4, 1550.00, DATE_SUB(CURDATE(), INTERVAL 10 DAY)),
(4, 1560.00, DATE_SUB(CURDATE(), INTERVAL 9 DAY)),
(4, 1555.00, DATE_SUB(CURDATE(), INTERVAL 8 DAY)),
(4, 1570.00, DATE_SUB(CURDATE(), INTERVAL 7 DAY)),
(4, 1590.00, DATE_SUB(CURDATE(), INTERVAL 6 DAY)),
(4, 1580.00, DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
(4, 1600.00, DATE_SUB(CURDATE(), INTERVAL 4 DAY)),
(4, 1610.00, DATE_SUB(CURDATE(), INTERVAL 3 DAY)),
(4, 1605.00, DATE_SUB(CURDATE(), INTERVAL 2 DAY)),
(4, 1612.80, DATE_SUB(CURDATE(), INTERVAL 1 DAY));

-- Asset 5: WIPRO (Current: 472.15)
INSERT INTO price_history (asset_id, price, recorded_at) VALUES
(5, 410.00, DATE_SUB(CURDATE(), INTERVAL 14 DAY)),
(5, 415.00, DATE_SUB(CURDATE(), INTERVAL 13 DAY)),
(5, 412.00, DATE_SUB(CURDATE(), INTERVAL 12 DAY)),
(5, 420.00, DATE_SUB(CURDATE(), INTERVAL 11 DAY)),
(5, 430.00, DATE_SUB(CURDATE(), INTERVAL 10 DAY)),
(5, 435.00, DATE_SUB(CURDATE(), INTERVAL 9 DAY)),
(5, 430.00, DATE_SUB(CURDATE(), INTERVAL 8 DAY)),
(5, 440.00, DATE_SUB(CURDATE(), INTERVAL 7 DAY)),
(5, 450.00, DATE_SUB(CURDATE(), INTERVAL 6 DAY)),
(5, 445.00, DATE_SUB(CURDATE(), INTERVAL 5 DAY)),
(5, 460.00, DATE_SUB(CURDATE(), INTERVAL 4 DAY)),
(5, 470.00, DATE_SUB(CURDATE(), INTERVAL 3 DAY)),
(5, 465.00, DATE_SUB(CURDATE(), INTERVAL 2 DAY)),
(5, 472.15, DATE_SUB(CURDATE(), INTERVAL 1 DAY));

-- 6. Insert Sample Orders
-- Historical FILLED orders (power the trade history & audit log)
INSERT INTO orders (id, user_id, asset_id, type, order_type, qty, filled_qty, reserved_cash, reserved_qty, limit_price, status, created_at) VALUES
(1, 1, 1, 'BUY',  'MARKET', 10, 10, 0, 0, NULL,    'FILLED', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(2, 2, 2, 'SELL', 'LIMIT',  5,  5, 0, 0, 3895.00, 'FILLED', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(3, 3, 3, 'BUY',  'MARKET', 12, 12, 0, 0, NULL,    'FILLED', DATE_SUB(NOW(), INTERVAL 90 MINUTE));

-- OPEN LIMIT orders (power the live order book + allow MARKET orders to match immediately)
-- SELL side — users with holdings offering shares
INSERT INTO orders (id, user_id, asset_id, type, order_type, qty, filled_qty, reserved_cash, reserved_qty, limit_price, status, created_at) VALUES
(4,  2, 1, 'SELL', 'LIMIT', 20, 0, 0, 20, 2590.00, 'OPEN', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),  -- Priya SELL RELI
(5,  2, 2, 'SELL', 'LIMIT', 15, 0, 0, 15, 3920.00, 'OPEN', DATE_SUB(NOW(), INTERVAL 25 MINUTE)),  -- Priya SELL TCS
(6,  3, 3, 'SELL', 'LIMIT', 25, 0, 0, 25, 1635.00, 'OPEN', DATE_SUB(NOW(), INTERVAL 20 MINUTE)),  -- Rohan SELL INFY
(7,  4, 4, 'SELL', 'LIMIT', 18, 0, 0, 18, 1610.00, 'OPEN', DATE_SUB(NOW(), INTERVAL 15 MINUTE)),  -- Kavya SELL HDFC
(8,  4, 5, 'SELL', 'LIMIT', 40, 0, 0, 40, 475.00, 'OPEN', DATE_SUB(NOW(), INTERVAL 10 MINUTE));   -- Kavya SELL WIPRO

-- BUY side — users wanting to buy (powers the bid side of the order book)
INSERT INTO orders (id, user_id, asset_id, type, order_type, qty, filled_qty, reserved_cash, reserved_qty, limit_price, status, created_at) VALUES
(9,  1, 2, 'BUY', 'LIMIT', 10, 0, 38700, 0, 3870.00, 'OPEN', DATE_SUB(NOW(), INTERVAL 28 MINUTE)),  -- Arjun BUY TCS
(10, 3, 4, 'BUY', 'LIMIT', 12, 0, 19080, 0, 1590.00, 'OPEN', DATE_SUB(NOW(), INTERVAL 22 MINUTE)),  -- Rohan BUY HDFC
(11, 4, 3, 'BUY', 'LIMIT', 8,  0, 12880, 0, 1610.00, 'OPEN', DATE_SUB(NOW(), INTERVAL 18 MINUTE)),  -- Kavya BUY INFY
(12, 1, 5, 'BUY', 'LIMIT', 50, 0, 23100, 0, 462.00, 'OPEN', DATE_SUB(NOW(), INTERVAL 8 MINUTE));    -- Arjun BUY WIPRO

-- 7. Insert Sample Trades (reference FILLED orders above for audit trail)
-- Schema now has nullable buy/sell order IDs so NULL is valid here
INSERT INTO trades (id, buy_order_id, sell_order_id, asset_id, qty, executed_price, executed_at) VALUES
(1, 1, NULL, 1, 10, 2581.50, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(2, NULL, 2,  2, 5,  3895.00, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(3, 3,   NULL, 3, 12, 1623.40, DATE_SUB(NOW(), INTERVAL 90 MINUTE));

-- 8. Insert Sample Ledger Entries
INSERT INTO ledger_entries (trade_id, user_id, entry_type, amount, asset_id, created_at) VALUES
(1, 1, 'DEBIT', 25815.00, 1, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(2, 2, 'CREDIT', 19475.00, 2, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(3, 3, 'DEBIT', 19480.80, 3, DATE_SUB(NOW(), INTERVAL 90 MINUTE));

-- 9. Backfill Audit Rows If Trigger Wasn't Installed Before Seeding
INSERT INTO audit_log (trade_id, tx_hash, created_at)
SELECT
    t.id,
    SHA2(CONCAT(t.id, '|', t.asset_id, '|', t.qty, '|', t.executed_price, '|', t.executed_at), 512),
    t.executed_at
FROM trades t
WHERE NOT EXISTS (
    SELECT 1
    FROM audit_log al
    WHERE al.trade_id = t.id
);
