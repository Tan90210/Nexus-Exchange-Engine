import pool from '../pool.js';

export const getPortfolioMtm = async (userId) => {
    const [rows] = await pool.query('SELECT * FROM portfolio_mtm WHERE user_id = ?', [userId]);
    return rows;
};

export const getCashBalance = async (userId) => {
    const [rows] = await pool.query('SELECT balance FROM wallets WHERE user_id = ?', [userId]);
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
    const [rows] = await pool.query('SELECT symbol, name FROM assets WHERE id = ?', [assetId]);
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
