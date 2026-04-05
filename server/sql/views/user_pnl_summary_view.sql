USE nexus_db;

-- user_pnl_summary_view: Aggregates per-user total portfolio value, total cost basis,
-- unrealised P&L, and percentage gain/loss. Uses RANK() window function to rank
-- users by portfolio value.
CREATE OR REPLACE VIEW user_pnl_summary_view AS
SELECT
    user_id,
    name AS user_name,
    total_market_value,
    total_book_value,
    unrealized_pnl,
    CASE
        WHEN total_book_value > 0 THEN ROUND((unrealized_pnl / total_book_value) * 100, 2)
        ELSE 0
    END AS pnl_pct,
    RANK() OVER (ORDER BY total_market_value DESC) AS portfolio_rank
FROM (
    SELECT
        h.user_id,
        u.name,
        SUM(h.quantity * a.current_price) AS total_market_value,
        SUM(h.quantity * h.avg_cost_basis) AS total_book_value,
        SUM((h.quantity * a.current_price) - (h.quantity * h.avg_cost_basis)) AS unrealized_pnl
    FROM
        holdings h
    JOIN
        assets a ON h.asset_id = a.id
    JOIN
        users u ON h.user_id = u.id
    GROUP BY
        h.user_id, u.name
) AS user_totals;
