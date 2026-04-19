USE nexus_db;

DROP PROCEDURE IF EXISTS settle_partial_trade;

DELIMITER //

CREATE PROCEDURE settle_partial_trade(
    IN p_buy_order_id  INT,
    IN p_sell_order_id INT,
    IN p_asset_id      INT,
    IN p_available_qty DECIMAL(15, 4),
    IN p_price         DECIMAL(15, 2)
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
    DECLARE v_buy_order_qty DECIMAL(15, 4);
    DECLARE v_buy_filled_qty DECIMAL(15, 4);
    DECLARE v_sell_order_qty DECIMAL(15, 4);
    DECLARE v_sell_filled_qty DECIMAL(15, 4);
    DECLARE v_buy_new_filled DECIMAL(15, 4);
    DECLARE v_sell_new_filled DECIMAL(15, 4);
    DECLARE v_buy_new_reserved_cash DECIMAL(15, 2);
    DECLARE v_sell_new_reserved_qty DECIMAL(15, 4);
    DECLARE v_lock_balance DECIMAL(15, 2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_total_cost = p_price * p_available_qty;

    START TRANSACTION;

    SELECT
        user_id,
        COALESCE(reserved_cash, 0),
        COALESCE(limit_price, 0),
        qty,
        COALESCE(filled_qty, 0)
    INTO
        v_buyer_id,
        v_buy_reserved_cash,
        v_buy_limit_price,
        v_buy_order_qty,
        v_buy_filled_qty
    FROM orders
    WHERE id = p_buy_order_id
    FOR UPDATE;

    SELECT
        user_id,
        COALESCE(reserved_qty, 0),
        qty,
        COALESCE(filled_qty, 0)
    INTO
        v_seller_id,
        v_sell_reserved_qty,
        v_sell_order_qty,
        v_sell_filled_qty
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

    IF COALESCE(v_seller_available_qty, 0) < p_available_qty THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSUFFICIENT_HOLDINGS';
    END IF;

    UPDATE wallets
    SET balance = balance - v_total_cost
    WHERE user_id = v_buyer_id;

    UPDATE wallets
    SET balance = balance + v_total_cost
    WHERE user_id = v_seller_id;

    INSERT INTO holdings (user_id, asset_id, quantity, avg_cost_basis)
    VALUES (v_buyer_id, p_asset_id, p_available_qty, p_price)
    ON DUPLICATE KEY UPDATE
        avg_cost_basis = (avg_cost_basis * quantity + v_total_cost) / (quantity + p_available_qty),
        quantity = quantity + p_available_qty;

    UPDATE holdings
    SET quantity = quantity - p_available_qty
    WHERE user_id = v_seller_id AND asset_id = p_asset_id;

    DELETE FROM holdings
    WHERE user_id = v_seller_id AND asset_id = p_asset_id AND quantity = 0;

    INSERT INTO trades (buy_order_id, sell_order_id, asset_id, qty, executed_price)
    VALUES (p_buy_order_id, p_sell_order_id, p_asset_id, p_available_qty, p_price);
    SET v_trade_id = LAST_INSERT_ID();

    INSERT INTO ledger_entries (trade_id, user_id, entry_type, amount, asset_id)
    VALUES (v_trade_id, v_buyer_id, 'DEBIT', v_total_cost, p_asset_id);

    INSERT INTO ledger_entries (trade_id, user_id, entry_type, amount, asset_id)
    VALUES (v_trade_id, v_seller_id, 'CREDIT', v_total_cost, p_asset_id);

    SET v_buy_new_filled = v_buy_filled_qty + p_available_qty;
    SET v_sell_new_filled = v_sell_filled_qty + p_available_qty;

    IF v_buy_reserved_cash > 0 THEN
        SET v_buy_new_reserved_cash = GREATEST(v_buy_reserved_cash - (p_available_qty * v_buy_limit_price), 0);
    ELSE
        SET v_buy_new_reserved_cash = 0;
    END IF;

    IF v_sell_reserved_qty > 0 THEN
        SET v_sell_new_reserved_qty = GREATEST(v_sell_reserved_qty - p_available_qty, 0);
    ELSE
        SET v_sell_new_reserved_qty = 0;
    END IF;

    UPDATE orders
    SET
        filled_qty = v_buy_new_filled,
        status = IF(v_buy_new_filled >= v_buy_order_qty, 'FILLED', 'OPEN'),
        reserved_cash = v_buy_new_reserved_cash
    WHERE id = p_buy_order_id;

    UPDATE orders
    SET
        filled_qty = v_sell_new_filled,
        status = IF(v_sell_new_filled >= v_sell_order_qty, 'FILLED', 'OPEN'),
        reserved_qty = v_sell_new_reserved_qty
    WHERE id = p_sell_order_id;

    COMMIT;

    SELECT v_trade_id AS tradeId, p_available_qty AS executedQty, p_price AS executedPrice;
END //

DELIMITER ;
