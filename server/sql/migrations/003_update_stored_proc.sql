USE nexus_db;

DROP PROCEDURE IF EXISTS execute_trade;

DELIMITER //

CREATE PROCEDURE execute_trade(
    IN p_buy_order_id INT,
    IN p_sell_order_id INT,
    IN p_asset_id INT,
    IN p_qty DECIMAL(15, 4),
    IN p_executed_price DECIMAL(15, 2)
)
BEGIN
    DECLARE p_buyer_id INT;
    DECLARE p_seller_id INT;
    DECLARE v_total_cost DECIMAL(15, 2);
    DECLARE v_trade_id INT;
    DECLARE v_first_id INT;
    DECLARE v_second_id INT;
    DECLARE v_dummy INT;

    -- Extract user IDs from order IDs
    SELECT user_id INTO p_buyer_id FROM orders WHERE id = p_buy_order_id;
    SELECT user_id INTO p_seller_id FROM orders WHERE id = p_sell_order_id;

    -- Error handling
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_total_cost = p_executed_price * p_qty;

    -- 1. Canonical Lock Order (Prevent Deadlocks)
    -- Lock user with lower ID first
    IF p_buyer_id < p_seller_id THEN
        SET v_first_id = p_buyer_id;
        SET v_second_id = p_seller_id;
    ELSE
        SET v_first_id = p_seller_id;
        SET v_second_id = p_buyer_id;
    END IF;

    START TRANSACTION;

    -- Acquire exclusive locks on both wallets (in canonical order)
    SELECT id INTO v_dummy FROM users WHERE id = v_first_id FOR UPDATE;
    SELECT id INTO v_dummy FROM users WHERE id = v_second_id FOR UPDATE;
    
    -- Also lock the seller's holding row
    SELECT quantity INTO v_dummy FROM holdings 
    WHERE user_id = p_seller_id AND asset_id = p_asset_id FOR UPDATE;

    -- 2. Validate Funds & Holdings
    IF (SELECT balance FROM wallets WHERE user_id = p_buyer_id) < v_total_cost THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSUFFICIENT_FUNDS';
    END IF;

    IF (SELECT quantity FROM holdings WHERE user_id = p_seller_id AND asset_id = p_asset_id) < p_qty THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSUFFICIENT_HOLDINGS';
    END IF;

    -- 3. Update Wallets
    UPDATE wallets SET balance = balance - v_total_cost WHERE user_id = p_buyer_id;
    UPDATE wallets SET balance = balance + v_total_cost WHERE user_id = p_seller_id;

    -- 4. Update Holdings
    -- Buyer Side (Upsert)
    INSERT INTO holdings (user_id, asset_id, quantity, avg_cost_basis)
    VALUES (p_buyer_id, p_asset_id, p_qty, p_executed_price)
    ON DUPLICATE KEY UPDATE 
        avg_cost_basis = (avg_cost_basis * quantity + v_total_cost) / (quantity + p_qty),
        quantity = quantity + p_qty;

    -- Seller Side
    UPDATE holdings SET quantity = quantity - p_qty 
    WHERE user_id = p_seller_id AND asset_id = p_asset_id;
    
    -- Remove holding if quantity is zero
    DELETE FROM holdings WHERE user_id = p_seller_id AND asset_id = p_asset_id AND quantity = 0;

    -- 5. Record Trade
    -- We can now record the real order ids instantly because we pass them!
    INSERT INTO trades (buy_order_id, sell_order_id, asset_id, qty, executed_price)
    VALUES (p_buy_order_id, p_sell_order_id, p_asset_id, p_qty, p_executed_price);
    SET v_trade_id = LAST_INSERT_ID();

    -- 5b. Update Orders
    -- Mark orders as fully FILLED and update filled_qty
    UPDATE orders SET status = 'FILLED', filled_qty = qty WHERE id IN (p_buy_order_id, p_sell_order_id);

    -- 6. Record Ledger Entries
    -- Buyer Debit (Cash)
    INSERT INTO ledger_entries (trade_id, user_id, entry_type, amount, asset_id)
    VALUES (v_trade_id, p_buyer_id, 'DEBIT', v_total_cost, p_asset_id);
    
    -- Seller Credit (Cash)
    INSERT INTO ledger_entries (trade_id, user_id, entry_type, amount, asset_id)
    VALUES (v_trade_id, p_seller_id, 'CREDIT', v_total_cost, p_asset_id);

    COMMIT;

    SELECT v_trade_id AS tradeId;
END //

DELIMITER ;
