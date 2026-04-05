USE nexus_db;

DROP PROCEDURE IF EXISTS cancel_order;

DELIMITER //

-- cancel_order: atomically cancels an OPEN order.
-- For LIMIT BUY orders: credits the unfilled reserved cash back to the wallet
--   and inserts a compensating CREDIT ledger entry.
-- For LIMIT SELL orders: restores the unfilled asset quantity back to holdings.
-- Rolls back if the order is not in OPEN state.
CREATE PROCEDURE cancel_order(IN p_order_id INT)
BEGIN
    DECLARE v_user_id     INT;
    DECLARE v_side        ENUM('BUY', 'SELL');
    DECLARE v_order_type  ENUM('MARKET', 'LIMIT');
    DECLARE v_qty         DECIMAL(15, 4);
    DECLARE v_filled_qty  DECIMAL(15, 4);
    DECLARE v_unfilled    DECIMAL(15, 4);
    DECLARE v_limit_price DECIMAL(15, 2);
    DECLARE v_asset_id    INT;
    DECLARE v_status      ENUM('OPEN', 'FILLED', 'CANCELLED');
    DECLARE v_refund_amt  DECIMAL(15, 2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Lock and read the order row
    SELECT user_id, type, order_type, qty, filled_qty, limit_price, asset_id, status
        INTO v_user_id, v_side, v_order_type, v_qty, v_filled_qty, v_limit_price, v_asset_id, v_status
        FROM orders WHERE id = p_order_id FOR UPDATE;

    IF v_status != 'OPEN' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_NOT_OPEN';
    END IF;

    SET v_unfilled = v_qty - COALESCE(v_filled_qty, 0);

    -- Refund unfilled portion for LIMIT orders
    IF v_order_type = 'LIMIT' THEN
        IF v_side = 'BUY' AND v_limit_price IS NOT NULL AND v_unfilled > 0 THEN
            SET v_refund_amt = v_unfilled * v_limit_price;
            -- Restore reserved cash to wallet
            SELECT id FROM users WHERE id = v_user_id FOR UPDATE;
            UPDATE wallets SET balance = balance + v_refund_amt WHERE user_id = v_user_id;
            -- Compensating credit ledger entry (NULL trade_id = non-trade event)
            INSERT INTO ledger_entries (trade_id, user_id, entry_type, amount, asset_id)
                VALUES (NULL, v_user_id, 'CREDIT', v_refund_amt, v_asset_id);
        ELSEIF v_side = 'SELL' AND v_unfilled > 0 THEN
            -- Restore reserved asset quantity to holdings
            INSERT INTO holdings (user_id, asset_id, quantity, avg_cost_basis)
                VALUES (v_user_id, v_asset_id, v_unfilled, 0)
                ON DUPLICATE KEY UPDATE quantity = quantity + v_unfilled;
        END IF;
    END IF;

    -- Cancel the order
    UPDATE orders SET status = 'CANCELLED' WHERE id = p_order_id;

    COMMIT;

    SELECT p_order_id AS orderId, 'CANCELLED' AS status;
END //

DELIMITER ;
