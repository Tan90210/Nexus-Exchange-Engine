USE nexus_db;

-- user_exchange_weight_view: Computes each user's total portfolio value and their
-- percentage share of the total capital held across the entire exchange. Uses an
-- unpartitioned SUM() OVER () window function.
CREATE OR REPLACE VIEW user_exchange_weight_view AS
SELECT
    user_totals.user_id,
    user_totals.user_name,
    user_totals.portfolio_value,
    ROUND((user_totals.portfolio_value / SUM(user_totals.portfolio_value) OVER ()) * 100, 2) AS exchange_weight_pct
FROM (
    -- Compute each user's total portfolio value (holdings + cash balance)
    -- This matches the subquery from user_pnl_summary but adds cash
    SELECT
        u.id AS user_id,
        u.name AS user_name,
        COALESCE(w.balance, 0) + COALESCE(SUM(h.quantity * a.current_price), 0) AS portfolio_value
    FROM
        users u
    LEFT JOIN
        wallets w ON u.id = w.user_id
    LEFT JOIN
        holdings h ON u.id = h.user_id
    LEFT JOIN
        assets a ON h.asset_id = a.id
    GROUP BY
        u.id, u.name, w.balance
) AS user_totals;
