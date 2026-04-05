USE nexus_db;

-- user_trade_summary_view: Per-user trading statistics. Total trades executed,
-- total traded volume, and most traded asset identified via a correlated subquery.
CREATE OR REPLACE VIEW user_trade_summary_view AS
SELECT
    le.user_id,
    u.name AS user_name,
    COUNT(DISTINCT le.trade_id) AS total_trades,
    SUM(le.amount) AS total_volume_traded,
    (
        SELECT a_sub.symbol
        FROM ledger_entries le_sub
        JOIN assets a_sub ON le_sub.asset_id = a_sub.id
        WHERE le_sub.user_id = le.user_id AND le_sub.trade_id IS NOT NULL
        GROUP BY le_sub.asset_id, a_sub.symbol
        ORDER BY COUNT(*) DESC, SUM(le_sub.amount) DESC
        LIMIT 1
    ) AS most_traded_asset
FROM
    ledger_entries le
JOIN
    users u ON le.user_id = u.id
WHERE
    le.trade_id IS NOT NULL
GROUP BY
    le.user_id,
    u.name;
