import pool from '../pool.js';

export const executeTradeProcedure = async (buyOrderId, sellOrderId, assetId, qty, executedPrice) => {
    const [rows] = await pool.query(
        'CALL execute_trade(?, ?, ?, ?, ?)',
        [buyOrderId, sellOrderId, assetId, qty, executedPrice]
    );

    return rows[0]?.[0] ?? null;
};

export const settlePartialTradeProcedure = async (buyOrderId, sellOrderId, assetId, availableQty, price) => {
    const [rows] = await pool.query(
        'CALL settle_partial_trade(?, ?, ?, ?, ?)',
        [buyOrderId, sellOrderId, assetId, availableQty, price]
    );
    return rows[0]?.[0] ?? null;
};

export const findMatchingOrder = async (assetId, side, qty, price) => {
    const oppositeSide = side === 'BUY' ? 'SELL' : 'BUY';
    const priceCondition = side === 'BUY'
        ? (price ? 'AND limit_price <= ?' : '')
        : (price ? 'AND limit_price >= ?' : '');

    const orderCondition = side === 'BUY'
        ? 'ORDER BY limit_price ASC, created_at ASC'
        : 'ORDER BY limit_price DESC, created_at ASC';

    const query = `
        SELECT *, (qty - COALESCE(filled_qty, 0)) AS remaining_qty 
        FROM orders 
        WHERE asset_id = ? 
        AND type = ? 
        AND status = 'OPEN'
        ${priceCondition}
        AND (qty - COALESCE(filled_qty, 0)) > 0
        ${orderCondition}
        LIMIT 1
    `;

    const params = price ? [assetId, oppositeSide, price] : [assetId, oppositeSide];
    const [rows] = await pool.query(query, params);
    return rows[0] || null;
};

export const createOrder = async (userId, assetId, side, orderType, qty, limitPrice) => {
    console.log('createOrder Debug - userId:', userId, 'assetId:', assetId);
    const [result] = await pool.query(
        'INSERT INTO orders (user_id, asset_id, type, order_type, qty, limit_price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, assetId, side, orderType, qty, limitPrice, 'OPEN']
    );
    return result.insertId;
};

export const updateOrderStatus = async (orderId, status) => {
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
};
