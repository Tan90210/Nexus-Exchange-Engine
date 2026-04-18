-- =============================================================================
-- deadlock_sim.sql — Deadlock Demonstration Script
-- =============================================================================
-- PURPOSE:
--   Intentionally creates a classic A-waits-B / B-waits-A deadlock between
--   two concurrent sessions to demonstrate MySQL InnoDB's automatic deadlock
--   detector. MySQL will pick one session as the victim, roll it back, and
--   let the other commit. No data is permanently corrupted.
--
-- HOW TO RUN (step-by-step):
--   Open TWO separate query tabs in MySQL Workbench (or two terminal sessions).
--   Execute steps in the order indicated by [S1-a], [S2-a], [S1-b], [S2-b].
--
-- EXPECTED RESULT:
--   One session receives: ERROR 1213 (40001): Deadlock found when trying to get lock
--   Then run: SHOW ENGINE INNODB STATUS\G
--   Look for "LATEST DETECTED DEADLOCK" — InnoDB will describe which transaction
--   was chosen as the victim and exactly which rows were in conflict.
-- =============================================================================

USE nexus_db;

-- =============================================================================
-- PASTE THE FOLLOWING BLOCK INTO  >>  TAB 1 (SESSION A)
-- =============================================================================

-- [S1-a] Lock user 1's wallet first
START TRANSACTION;
SELECT balance FROM wallets WHERE user_id = 1 FOR UPDATE;
-- >>> Pause here. Switch to Tab 2 and run S2-a and S2-b. Then run S1-b below. <<<

-- [S1-b] Try to lock user 2's wallet — DEADLOCK: session 2 already holds it
UPDATE wallets SET balance = balance - 100 WHERE user_id = 2;
COMMIT;


-- =============================================================================
-- PASTE THE FOLLOWING BLOCK INTO  >>  TAB 2 (SESSION B)
-- =============================================================================

-- [S2-a] Lock user 2's wallet first (opposite order to Session A!)
START TRANSACTION;
SELECT balance FROM wallets WHERE user_id = 2 FOR UPDATE;

-- [S2-b] Try to lock user 1's wallet — DEADLOCK: session 1 already holds it
--         InnoDB detects the circular wait and picks one session as victim.
UPDATE wallets SET balance = balance - 100 WHERE user_id = 1;
COMMIT;


-- =============================================================================
-- DIAGNOSTIC — run in any tab after triggering the deadlock
-- =============================================================================
-- SHOW ENGINE INNODB STATUS\G
-- Look for: "LATEST DETECTED DEADLOCK"
-- It will list:
--   (1) The two transactions involved
--   (2) Which row each held and which it was waiting for
--   (3) Which transaction InnoDB chose to roll back (the "victim")


-- =============================================================================
-- WHY execute_trade NEVER DEADLOCKS
-- =============================================================================
-- The stored procedure ALWAYS locks in ascending user_id order:
--
--   IF v_buyer_id < v_seller_id THEN
--       lock v_buyer_id first, then v_seller_id;
--   ELSE
--       lock v_seller_id first, then v_buyer_id;
--   END IF;
--
-- Two concurrent trades involving users 1 and 2 will BOTH try to lock user 1
-- first, then user 2. One simply waits — no circular dependency, no deadlock.
-- The simulation above deliberately reverses this order to force the deadlock.
-- =============================================================================
