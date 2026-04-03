USE nexus_db;

DROP PROCEDURE IF EXISTS execute_trade;

DELIMITER //

CREATE PROCEDURE execute_trade(
    IN p_user_id INT,
    IN p_asset_id INT,
    IN p_side ENUM('BUY', 'SELL'),
    IN p_order_type ENUM('MARKET', 'LIMIT'),
    IN p_qty DECIMAL(15, 4),
    IN p_limit_price DECIMAL(15, 2)
)
BEGIN
    DECLARE v_executed_price DECIMAL(15, 2);
    DECLARE v_total_cost DECIMAL(15, 2);
    DECLARE v_user_balance DECIMAL(15, 2);
    DECLARE v_holding_qty DECIMAL(15, 4);
    DECLARE v_order_id INT;
    DECLARE v_trade_id INT;

    -- Error handling
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- 1. Canonical Lock Order (Prevent Deadlocks)
    -- In a real exchange, we would match against an order book.
    -- Here we simulate a trade against the 'system' or verify inventory.
    -- To prevent deadlocks in concurrent user updates, we lock user first.
    SELECT balance INTO v_user_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;

    -- 2. Validate Order
    SELECT current_price INTO v_executed_price FROM assets WHERE id = p_asset_id;
    
    IF p_order_type = 'LIMIT' THEN
        SET v_executed_price = p_limit_price;
    END IF;

    SET v_total_cost = v_executed_price * p_qty;

    IF p_side = 'BUY' THEN
        IF v_user_balance < v_total_cost THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSUFFICIENT_FUNDS';
        END IF;
        
        -- Update Wallet
        UPDATE wallets SET balance = balance - v_total_cost WHERE user_id = p_user_id;
        
        -- Update Holdings (Upsert)
        INSERT INTO holdings (user_id, asset_id, quantity, avg_cost_basis)
        VALUES (p_user_id, p_asset_id, p_qty, v_executed_price)
        ON DUPLICATE KEY UPDATE 
            avg_cost_basis = (avg_cost_basis * quantity + v_total_cost) / (quantity + p_qty),
            quantity = quantity + p_qty;

    ELSE -- SELL
        SELECT quantity INTO v_holding_qty FROM holdings 
        WHERE user_id = p_user_id AND asset_id = p_asset_id FOR UPDATE;
        
        IF v_holding_qty IS NULL OR v_holding_qty < p_qty THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSUFFICIENT_HOLDINGS';
        END IF;

        -- Update Wallet
        UPDATE wallets SET balance = balance + v_total_cost WHERE user_id = p_user_id;
        
        -- Update Holdings
        UPDATE holdings SET quantity = quantity - p_qty 
        WHERE user_id = p_user_id AND asset_id = p_asset_id;
        
        -- Clean up empty holdings
        DELETE FROM holdings WHERE user_id = p_user_id AND asset_id = p_asset_id AND quantity = 0;
    END IF;

    -- 3. Record Order
    INSERT INTO orders (user_id, asset_id, type, order_type, qty, limit_price, status)
    VALUES (p_user_id, p_asset_id, p_side, p_order_type, p_qty, p_limit_price, 'FILLED');
    SET v_order_id = LAST_INSERT_ID();

    -- 4. Record Trade
    -- For simplicity, we assume the system is the counterparty for now.
    -- We use NULL for the other order ID since there is no matching order in our system-only demo
    INSERT INTO trades (buy_order_id, sell_order_id, asset_id, qty, executed_price)
    VALUES (
        IF(p_side = 'BUY', v_order_id, NULL),
        IF(p_side = 'SELL', v_order_id, NULL),
        p_asset_id,
        p_qty,
        v_executed_price
    );
    SET v_trade_id = LAST_INSERT_ID();

    -- 5. Record Ledger Entries
    INSERT INTO ledger_entries (trade_id, user_id, entry_type, amount, asset_id)
    VALUES (v_trade_id, p_user_id, IF(p_side = 'BUY', 'DEBIT', 'CREDIT'), v_total_cost, p_asset_id);

    COMMIT;

    -- Return the result
    SELECT
        v_trade_id AS tradeId,
        v_executed_price AS executedPrice,
        v_total_cost AS totalValue;
END //

DELIMITER ;
