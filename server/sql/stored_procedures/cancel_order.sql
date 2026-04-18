USE nexus_db;

DROP PROCEDURE IF EXISTS cancel_order;

DELIMITER //

-- cancel_order: atomically cancels an OPEN order.
-- Reservations are tracked on the order row itself, so cancellation clears the
-- remaining reservation and marks the order as CANCELLED.
CREATE PROCEDURE cancel_order(IN p_order_id INT)
BEGIN
    DECLARE v_user_id     INT;
    DECLARE v_side        ENUM('BUY', 'SELL');
    DECLARE v_order_type  ENUM('MARKET', 'LIMIT');
    DECLARE v_qty         DECIMAL(15, 4);
    DECLARE v_filled_qty  DECIMAL(15, 4);
    DECLARE v_asset_id    INT;
    DECLARE v_status      ENUM('OPEN', 'FILLED', 'CANCELLED');

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Lock and read the order row
    SELECT user_id, type, order_type, qty, filled_qty, asset_id, status
        INTO v_user_id, v_side, v_order_type, v_qty, v_filled_qty, v_asset_id, v_status
        FROM orders WHERE id = p_order_id FOR UPDATE;

    IF v_status != 'OPEN' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ORDER_NOT_OPEN';
    END IF;

    UPDATE orders
    SET
        status = 'CANCELLED',
        reserved_cash = 0,
        reserved_qty = 0
    WHERE id = p_order_id;

    COMMIT;

    SELECT p_order_id AS orderId, 'CANCELLED' AS status;
END //

DELIMITER ;
