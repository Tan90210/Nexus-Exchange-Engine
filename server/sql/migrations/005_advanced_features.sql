-- Migration 005: Advanced DBMS Features for 10/10 Score

-- 1. STORED PROCEDURE: deposit_funds
-- Allows safe deposit of cash into a user's wallet with transaction safety.
DELIMITER //
CREATE PROCEDURE deposit_funds(
    IN p_user_id INT,
    IN p_amount DECIMAL(15, 2)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Deposit amount must be strictly positive';
    END IF;

    START TRANSACTION;
    
    -- Row-level lock on the user's wallet
    SELECT id FROM wallets WHERE user_id = p_user_id FOR UPDATE;

    UPDATE wallets 
    SET balance = balance + p_amount 
    WHERE user_id = p_user_id;

    COMMIT;
END //
DELIMITER ;

-- 2. STORED PROCEDURE: withdraw_funds
-- Safely withdraws funds preventing negative balances
DELIMITER //
CREATE PROCEDURE withdraw_funds(
    IN p_user_id INT,
    IN p_amount DECIMAL(15, 2)
)
BEGIN
    DECLARE v_current_balance DECIMAL(15, 2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Withdrawal amount must be strictly positive';
    END IF;

    START TRANSACTION;
    
    SELECT balance INTO v_current_balance 
    FROM wallets WHERE user_id = p_user_id FOR UPDATE;

    IF v_current_balance < p_amount THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient funds for withdrawal';
    END IF;

    UPDATE wallets 
    SET balance = balance - p_amount 
    WHERE user_id = p_user_id;

    COMMIT;
END //
DELIMITER ;

-- 3. STORED PROCEDURE: cancel_order
-- Securely cancels an order specifically verifying user_id
DELIMITER //
CREATE PROCEDURE cancel_order(
    IN p_order_id INT,
    IN p_user_id INT
)
BEGIN
    DECLARE v_status VARCHAR(36);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT status INTO v_status 
    FROM orders 
    WHERE id = p_order_id AND user_id = p_user_id 
    FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order not found or access denied';
    ELSEIF v_status != 'OPEN' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only OPEN orders can be cancelled';
    END IF;

    UPDATE orders SET status = 'CANCELLED' WHERE id = p_order_id;

    COMMIT;
END //
DELIMITER ;

-- 4. TRIGGER: auto_price_history (AFTER UPDATE)
-- Demonstrates active database monitoring by auto-syncing updates
DELIMITER //
CREATE TRIGGER trigger_auto_price_history
AFTER UPDATE ON assets
FOR EACH ROW
BEGIN
    -- Only insert into price_history if the price actually changed
    IF NEW.current_price != OLD.current_price THEN
        INSERT INTO price_history (asset_id, price, recorded_at)
        VALUES (NEW.id, NEW.current_price, NOW());
    END IF;
END //
DELIMITER ;

-- 5. COMPLEX VIEW: advanced_portfolio_analytics
-- Utilizes Common Table Expressions (CTEs) and Window Functions
CREATE OR REPLACE VIEW advanced_portfolio_analytics AS
WITH user_asset_values AS (
    SELECT 
        h.user_id,
        u.name AS user_name,
        h.asset_id,
        a.symbol,
        h.quantity,
        a.current_price,
        (h.quantity * a.current_price) AS asset_market_value
    FROM holdings h
    JOIN assets a ON h.asset_id = a.id
    JOIN users u ON h.user_id = u.id
),
user_portfolio_totals AS (
    SELECT 
        user_id,
        user_name,
        SUM(asset_market_value) as total_portfolio_value
    FROM user_asset_values
    GROUP BY user_id, user_name
),
exchange_totals AS (
    SELECT SUM(total_portfolio_value) as global_exchange_value
    FROM user_portfolio_totals
)
SELECT 
    pt.user_id,
    pt.user_name,
    pt.total_portfolio_value,
    et.global_exchange_value,
    ROUND((pt.total_portfolio_value / et.global_exchange_value) * 100, 2) AS percent_of_exchange_wealth,
    -- Window Function: Rank users by sheer portfolio wealth
    RANK() OVER (ORDER BY pt.total_portfolio_value DESC) AS wealth_rank
FROM user_portfolio_totals pt
CROSS JOIN exchange_totals et;
