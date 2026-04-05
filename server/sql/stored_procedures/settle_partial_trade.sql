USE nexus_db;

DROP PROCEDURE IF EXISTS settle_partial_trade;

DELIMITER //

-- settle_partial_trade: handles the case where a matching sell order has less
-- quantity than the buyer requested. Executes the trade for available_qty,
-- increments filled_qty on the buy order (keeping it OPEN), and marks the
-- sell order as FILLED. Uses identical canonical lock ordering as execute_trade.
CREATE PROCEDURE settle_partial_trade(
    IN p_buy_order_id  INT,
    IN p_sell_order_id INT,
    IN p_asset_id      INT,
    IN p_available_qty DECIMAL(15, 4),
    IN p_price         DECIMAL(15, 2)
)
BEGIN
    DECLARE v_buyer_id     INT;
    DECLARE v_seller_id    INT;
    DECLARE v_total_cost   DECIMAL(15, 2);
    DECLARE v_trade_id     INT;
    DECLARE v_first_id     INT;
    DECLARE v_second_id    INT;
    DECLARE v_dummy        INT;
    DECLARE v_new_filled   DECIMAL(15, 4);
    DECLARE v_order_qty    DECIMAL(15, 4);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Resolve buyer and seller user IDs from order IDs
    SELECT user_id INTO v_buyer_id  FROM orders WHERE id = p_buy_order_id;
    SELECT user_id INTO v_seller_id FROM orders WHERE id = p_sell_order_id;

    SET v_total_cost = p_price * p_available_qty;

    -- Canonical lock order: lower user_id first (deadlock prevention)
    IF v_buyer_id < v_seller_id THEN
        SET v_first_id  = v_buyer_id;
        SET v_second_id = v_seller_id;
    ELSE
        SET v_first_id  = v_seller_id;
        SET v_second_id = v_buyer_id;
    END IF;

    START TRANSACTION;

    -- Acquire exclusive locks in canonical order
    SELECT id INTO v_dummy FROM users WHERE id = v_first_id  FOR UPDATE;
    SELECT id INTO v_dummy FROM users WHERE id = v_second_id FOR UPDATE;
    SELECT quantity INTO v_dummy FROM holdings
        WHERE user_id = v_seller_id AND asset_id = p_asset_id FOR UPDATE;

    -- Validate funds and holdings
    IF (SELECT balance FROM wallets WHERE user_id = v_buyer_id) < v_total_cost THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSUFFICIENT_FUNDS';
    END IF;

    IF (SELECT quantity FROM holdings WHERE user_id = v_seller_id AND asset_id = p_asset_id) < p_available_qty THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INSUFFICIENT_HOLDINGS';
    END IF;

    -- Transfer cash
    UPDATE wallets SET balance = balance - v_total_cost WHERE user_id = v_buyer_id;
    UPDATE wallets SET balance = balance + v_total_cost WHERE user_id = v_seller_id;

    -- Update buyer holdings (WAC upsert)
    INSERT INTO holdings (user_id, asset_id, quantity, avg_cost_basis)
        VALUES (v_buyer_id, p_asset_id, p_available_qty, p_price)
        ON DUPLICATE KEY UPDATE
            avg_cost_basis = (avg_cost_basis * quantity + v_total_cost) / (quantity + p_available_qty),
            quantity       = quantity + p_available_qty;

    -- Update seller holdings
    UPDATE holdings SET quantity = quantity - p_available_qty
        WHERE user_id = v_seller_id AND asset_id = p_asset_id;
    DELETE FROM holdings
        WHERE user_id = v_seller_id AND asset_id = p_asset_id AND quantity = 0;

    -- Record trade
    INSERT INTO trades (buy_order_id, sell_order_id, asset_id, qty, executed_price)
        VALUES (p_buy_order_id, p_sell_order_id, p_asset_id, p_available_qty, p_price);
    SET v_trade_id = LAST_INSERT_ID();

    -- Double-entry ledger
    INSERT INTO ledger_entries (trade_id, user_id, entry_type, amount, asset_id)
        VALUES (v_trade_id, v_buyer_id,  'DEBIT',  v_total_cost, p_asset_id);
    INSERT INTO ledger_entries (trade_id, user_id, entry_type, amount, asset_id)
        VALUES (v_trade_id, v_seller_id, 'CREDIT', v_total_cost, p_asset_id);

    -- Update buy order fill progress
    SELECT qty, filled_qty INTO v_order_qty, v_new_filled FROM orders WHERE id = p_buy_order_id;
    SET v_new_filled = v_new_filled + p_available_qty;
    UPDATE orders SET
        filled_qty = v_new_filled,
        status     = IF(v_new_filled >= v_order_qty, 'FILLED', 'OPEN')
    WHERE id = p_buy_order_id;

    -- Sell order is fully filled
    UPDATE orders SET filled_qty = qty, status = 'FILLED' WHERE id = p_sell_order_id;

    COMMIT;

    SELECT v_trade_id AS tradeId, p_available_qty AS executedQty, p_price AS executedPrice;
END //

DELIMITER ;
