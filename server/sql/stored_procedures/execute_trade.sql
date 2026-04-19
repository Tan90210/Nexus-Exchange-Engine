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
    DECLARE v_buyer_id INT;
    DECLARE v_seller_id INT;
    DECLARE v_total_cost DECIMAL(15, 2);
    DECLARE v_trade_id INT;
    DECLARE v_first_id INT;
    DECLARE v_second_id INT;
    DECLARE v_buyer_balance DECIMAL(15, 2);
    DECLARE v_seller_available_qty DECIMAL(15, 4);
    DECLARE v_buy_reserved_cash DECIMAL(15, 2);
    DECLARE v_sell_reserved_qty DECIMAL(15, 4);
    DECLARE v_buy_limit_price DECIMAL(15, 2);
    DECLARE v_lock_balance DECIMAL(15, 2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_total_cost = p_executed_price * p_qty;

    START TRANSACTION;

    SELECT
        user_id,
        COALESCE(reserved_cash, 0),
        COALESCE(limit_price, 0)
    INTO
        v_buyer_id,
        v_buy_reserved_cash,
        v_buy_limit_price
    FROM orders
    WHERE id = p_buy_order_id
    FOR UPDATE;

    SELECT
        user_id,
        COALESCE(reserved_qty, 0)
    INTO
        v_seller_id,
        v_sell_reserved_qty
    FROM orders
    WHERE id = p_sell_order_id
    FOR UPDATE;

    IF v_buyer_id <= v_seller_id THEN
        SET v_first_id = v_buyer_id;
        SET v_second_id = v_seller_id;
    ELSE
        SET v_first_id = v_seller_id;
        SET v_second_id = v_buyer_id;
    END IF;

    SELECT balance INTO v_lock_balance
    FROM wallets
    WHERE user_id = v_first_id
    FOR UPDATE;

    IF v_second_id != v_first_id THEN
        SELECT balance INTO v_lock_balance
        FROM wallets
        WHERE user_id = v_second_id
        FOR UPDATE;
    END IF;

    SELECT balance INTO v_buyer_balance
    FROM wallets
    WHERE user_id = v_buyer_id;

    IF v_sell_reserved_qty > 0 THEN
        SET v_seller_available_qty = v_sell_reserved_qty;
    ELSE
        SELECT quantity INTO v_seller_available_qty
        FROM holdings
        WHERE user_id = v_seller_id AND asset_id = p_asset_id
        FOR UPDATE;
    END IF;

    IF v_buy_reserved_cash > 0 THEN
        IF v_buy_reserved_cash < v_total_cost THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSUFFICIENT_FUNDS';
        END IF;
    ELSEIF v_buyer_balance < v_total_cost THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSUFFICIENT_FUNDS';
    END IF;

    IF COALESCE(v_seller_available_qty, 0) < p_qty THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSUFFICIENT_HOLDINGS';
    END IF;

    UPDATE wallets
    SET balance = balance - v_total_cost
    WHERE user_id = v_buyer_id;

    UPDATE wallets
    SET balance = balance + v_total_cost
    WHERE user_id = v_seller_id;

    INSERT INTO holdings (user_id, asset_id, quantity, avg_cost_basis)
    VALUES (v_buyer_id, p_asset_id, p_qty, p_executed_price)
    ON DUPLICATE KEY UPDATE
        avg_cost_basis = (avg_cost_basis * quantity + v_total_cost) / (quantity + p_qty),
        quantity = quantity + p_qty;

    UPDATE holdings
    SET quantity = quantity - p_qty
    WHERE user_id = v_seller_id AND asset_id = p_asset_id;

    DELETE FROM holdings
    WHERE user_id = v_seller_id AND asset_id = p_asset_id AND quantity = 0;

    INSERT INTO trades (buy_order_id, sell_order_id, asset_id, qty, executed_price)
    VALUES (p_buy_order_id, p_sell_order_id, p_asset_id, p_qty, p_executed_price);
    SET v_trade_id = LAST_INSERT_ID();

    INSERT INTO ledger_entries (trade_id, user_id, entry_type, amount, asset_id)
    VALUES (v_trade_id, v_buyer_id, 'DEBIT', v_total_cost, p_asset_id);

    INSERT INTO ledger_entries (trade_id, user_id, entry_type, amount, asset_id)
    VALUES (v_trade_id, v_seller_id, 'CREDIT', v_total_cost, p_asset_id);

    UPDATE orders
    SET
        status = 'FILLED',
        filled_qty = qty,
        reserved_cash = 0
    WHERE id = p_buy_order_id;

    UPDATE orders
    SET
        status = 'FILLED',
        filled_qty = qty,
        reserved_qty = 0
    WHERE id = p_sell_order_id;

    COMMIT;

    SELECT v_trade_id AS tradeId;
END //

DELIMITER ;
