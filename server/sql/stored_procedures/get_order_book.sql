USE nexus_db;

DROP PROCEDURE IF EXISTS get_order_book;

DELIMITER //

-- get_order_book: returns the live order book for a given asset.
-- All OPEN LIMIT orders, BUY side sorted by highest price first (DESC),
-- SELL side by lowest price first (ASC). Within each price level,
-- earlier orders take priority (time priority — ORDER BY created_at ASC).
-- Uses FIELD() to group BUY orders before SELL orders.
CREATE PROCEDURE get_order_book(IN p_asset_id INT)
BEGIN
    SELECT
        o.id                                            AS order_id,
        o.user_id,
        u.name                                          AS user_name,
        o.type                                          AS side,
        o.qty,
        COALESCE(o.filled_qty, 0)                       AS filled_qty,
        o.qty - COALESCE(o.filled_qty, 0)              AS remaining_qty,
        o.limit_price,
        o.created_at
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.asset_id   = p_asset_id
      AND o.status     = 'OPEN'
      AND o.order_type = 'LIMIT'
    ORDER BY
        FIELD(o.type, 'BUY', 'SELL'),
        CASE WHEN o.type = 'BUY'  THEN -o.limit_price END ASC,
        CASE WHEN o.type = 'SELL' THEN  o.limit_price END ASC,
        o.created_at ASC;
END //

DELIMITER ;
