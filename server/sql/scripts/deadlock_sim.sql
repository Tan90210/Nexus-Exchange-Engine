-- NEXUS EXCHANGE ENGINE: DEADLOCK SIMULATION
-- Open two terminal windows and connect to mysql

-- SESSION A:
-- START TRANSACTION;
-- UPDATE wallets SET balance = balance - 100 WHERE user_id = 1; -- Locks User 1
-- (Wait for Session B to lock User 2)
-- UPDATE wallets SET balance = balance - 100 WHERE user_id = 2; -- Tries to lock User 2 (WAITS)

-- SESSION B:
-- START TRANSACTION;
-- UPDATE wallets SET balance = balance - 100 WHERE user_id = 2; -- Locks User 2
-- (Now Session A is waiting)
-- UPDATE wallets SET balance = balance - 100 WHERE user_id = 1; -- Tries to lock User 1 (DEADLOCK!)

-- The Nexus `execute_trade` procedure prevents this by:
-- SELECT ... FROM wallets WHERE user_id = p_user_id FOR UPDATE;
-- And recommending canonical ordering for multi-user operations.

-- TO SHOW DATA:
-- SHOW ENGINE INNODB STATUS;
