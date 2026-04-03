import pool from '../pool.js';

export const executeTradeProcedure = async (userId, assetId, side, orderType, qty, limitPrice) => {
    const [rows] = await pool.query(
        'CALL execute_trade(?, ?, ?, ?, ?, ?)',
        [userId, assetId, side, orderType, qty, limitPrice]
    );

    return rows[0]?.[0] ?? null;
};
