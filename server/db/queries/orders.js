import pool from '../pool.js';

export const cancelOrderProcedure = async (orderId) => {
    const [rows] = await pool.query('CALL cancel_order(?)', [orderId]);
    return rows[0]?.[0] ?? null;
};

export const getOrderBookProcedure = async (assetId) => {
    const [rows] = await pool.query('CALL get_order_book(?)', [assetId]);
    return rows[0] || [];
};

export const getUserOrders = async (userId, limit = 50) => {
    const [rows] = await pool.query(
        `SELECT o.*, a.symbol AS assetSymbol
         FROM orders o
         JOIN assets a ON o.asset_id = a.id
         WHERE o.user_id = ?
         ORDER BY o.created_at DESC
         LIMIT ?`,
        [userId, limit]
    );
    return rows;
};
