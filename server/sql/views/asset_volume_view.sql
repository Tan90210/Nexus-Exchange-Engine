USE nexus_db;

-- asset_volume_view: Computes total quantity traded and total value traded
-- (SUM(qty × executed_price)) per asset using GROUP BY.
CREATE OR REPLACE VIEW asset_volume_view AS
SELECT
    t.asset_id,
    a.symbol,
    a.name,
    COUNT(t.id) AS total_trades,
    SUM(t.qty) AS total_quantity_traded,
    SUM(t.qty * t.executed_price) AS total_value_traded
FROM
    trades t
JOIN
    assets a ON t.asset_id = a.id
GROUP BY
    t.asset_id,
    a.symbol,
    a.name;
