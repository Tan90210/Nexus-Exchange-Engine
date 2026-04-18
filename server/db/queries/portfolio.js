import pool from '../pool.js';

export const getPortfolioMtm = async (userId) => {
    const [rows] = await pool.query(
        `
        SELECT
            pm.user_id,
            pm.asset_id,
            pm.symbol,
            pm.name,
            pm.quantity,
            pm.avg_cost_basis,
            pm.current_price,
            pm.market_value,
            pm.book_value,
            pm.unrealized_pnl,
            pm.pnl_pct,
            GREATEST(pm.quantity - COALESCE(reservations.reserved_qty, 0), 0) AS available_quantity
        FROM portfolio_mtm pm
        LEFT JOIN (
            SELECT
                user_id,
                asset_id,
                SUM(reserved_qty) AS reserved_qty
            FROM orders
            WHERE status = 'OPEN' AND type = 'SELL'
            GROUP BY user_id, asset_id
        ) reservations
            ON reservations.user_id = pm.user_id
           AND reservations.asset_id = pm.asset_id
        WHERE pm.user_id = ?
        `,
        [userId]
    );
    return rows;
};

export const getCashBalance = async (userId) => {
    const [rows] = await pool.query(
        `
        SELECT
            GREATEST(
                w.balance - COALESCE((
                    SELECT SUM(o.reserved_cash)
                    FROM orders o
                    WHERE o.user_id = w.user_id
                      AND o.status = 'OPEN'
                      AND o.type = 'BUY'
                ), 0),
                0
            ) AS balance
        FROM wallets w
        WHERE w.user_id = ?
        `,
        [userId]
    );
    return rows.length ? rows[0].balance : 0;
};

export const getPriceHistory = async (assetId, days) => {
    const [rows] = await pool.query(
        'SELECT price, recorded_at FROM price_history WHERE asset_id = ? AND recorded_at >= DATE_SUB(NOW(), INTERVAL ? DAY) ORDER BY recorded_at ASC',
        [assetId, days]
    );
    return rows;
};

export const getAssetById = async (assetId) => {
    const [rows] = await pool.query('SELECT symbol, name, current_price FROM assets WHERE id = ?', [assetId]);
    return rows.length ? rows[0] : null;
};

export const getAllAssets = async () => {
    const [rows] = await pool.query(
        'SELECT id AS assetId, symbol, name, current_price AS currentPrice FROM assets ORDER BY symbol ASC'
    );
    return rows;
};

export const getPortfolioDailyChange = async (userId) => {
    const query = `
        SELECT
            ROUND(
                (
                    SUM(h.quantity * a.current_price) - SUM(h.quantity * COALESCE(prev.price, a.current_price))
                ) / NULLIF(SUM(h.quantity * COALESCE(prev.price, a.current_price)), 0) * 100,
                2
            ) AS daily_change
        FROM holdings h
        JOIN assets a ON a.id = h.asset_id
        LEFT JOIN (
            SELECT ph.asset_id, ph.price
            FROM price_history ph
            JOIN (
                SELECT asset_id, MAX(recorded_at) AS recorded_at
                FROM price_history
                WHERE recorded_at < CURDATE()
                GROUP BY asset_id
            ) latest
                ON latest.asset_id = ph.asset_id
               AND latest.recorded_at = ph.recorded_at
        ) prev ON prev.asset_id = h.asset_id
        WHERE h.user_id = ?
    `;

    const [rows] = await pool.query(query, [userId]);
    return rows[0]?.daily_change ?? 0;
};

export const getUserPnlSummary = async () => {
    const [rows] = await pool.query('SELECT * FROM user_pnl_summary_view ORDER BY portfolio_rank ASC');
    return rows;
};

export const getAssetVolume = async () => {
    const [rows] = await pool.query('SELECT * FROM asset_volume_view ORDER BY total_value_traded DESC');
    return rows;
};

export const getUserTradeSummary = async () => {
    const [rows] = await pool.query('SELECT * FROM user_trade_summary_view ORDER BY total_trades DESC');
    return rows;
};

export const getRunningBalance = async (userId) => {
    const [rows] = await pool.query('SELECT * FROM running_balance_view WHERE user_id = ? ORDER BY created_at ASC', [userId]);
    return rows;
};

export const getUserExchangeWeight = async () => {
    const [rows] = await pool.query('SELECT * FROM user_exchange_weight_view ORDER BY portfolio_value DESC');
    return rows;
};

export const getOpenOrders = async () => {
    const [rows] = await pool.query('SELECT * FROM open_orders_view ORDER BY created_at DESC');
    return rows;
};

export const getWacData = async () => {
    const [rows] = await pool.query(`
        SELECT wv.*, u.name AS user_name
        FROM wac_view wv
        JOIN users u ON u.id = wv.user_id
        ORDER BY wv.user_id, wv.symbol ASC
    `);
    return rows;
};

export const updateAssetPrice = async (assetId, newPrice) => {
    await pool.query(
        'UPDATE assets SET current_price = ? WHERE id = ?',
        [newPrice, assetId]
    );
    const [rows] = await pool.query('SELECT id, symbol, name, current_price FROM assets WHERE id = ?', [assetId]);
    return rows[0] ?? null;
};
