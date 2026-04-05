USE nexus_db;

CREATE OR REPLACE VIEW open_orders_view AS
SELECT
    o.id AS order_id,
    o.user_id,
    a.symbol AS asset_symbol,
    o.type AS side,
    o.order_type,
    o.qty,
    COALESCE(o.filled_qty, 0) AS filled_qty,
    o.qty - COALESCE(o.filled_qty, 0) AS remaining_qty,
    o.limit_price,
    o.created_at
FROM
    orders o
JOIN
    assets a ON o.asset_id = a.id
WHERE
    o.status = 'OPEN';
