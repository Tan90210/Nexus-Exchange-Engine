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
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        let reservedCash = 0;
        let reservedQty = 0;

        if (orderType === 'LIMIT') {
            if (side === 'BUY') {
                reservedCash = Number(qty) * Number(limitPrice || 0);

                const [walletRows] = await connection.query(
                    'SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE',
                    [userId]
                );
                const wallet = walletRows[0];

                await connection.query(
                    `SELECT id
                     FROM orders
                     WHERE user_id = ? AND type = 'BUY' AND status = 'OPEN'
                     FOR UPDATE`,
                    [userId]
                );

                const [reservationRows] = await connection.query(
                    `SELECT COALESCE(SUM(reserved_cash), 0) AS reserved_cash
                     FROM orders
                     WHERE user_id = ? AND type = 'BUY' AND status = 'OPEN'`,
                    [userId]
                );

                const availableCash = Number(wallet?.balance || 0) - Number(reservationRows[0]?.reserved_cash || 0);
                if (availableCash < reservedCash) {
                    const error = new Error('INSUFFICIENT_FUNDS');
                    error.sqlState = '45000';
                    throw error;
                }
            } else if (side === 'SELL') {
                reservedQty = Number(qty);

                const [holdingRows] = await connection.query(
                    'SELECT quantity FROM holdings WHERE user_id = ? AND asset_id = ? FOR UPDATE',
                    [userId, assetId]
                );

                await connection.query(
                    `SELECT id
                     FROM orders
                     WHERE user_id = ? AND asset_id = ? AND type = 'SELL' AND status = 'OPEN'
                     FOR UPDATE`,
                    [userId, assetId]
                );

                const [reservationRows] = await connection.query(
                    `SELECT COALESCE(SUM(reserved_qty), 0) AS reserved_qty
                     FROM orders
                     WHERE user_id = ? AND asset_id = ? AND type = 'SELL' AND status = 'OPEN'`,
                    [userId, assetId]
                );

                const availableQty = Number(holdingRows[0]?.quantity || 0) - Number(reservationRows[0]?.reserved_qty || 0);
                if (availableQty < reservedQty) {
                    const error = new Error('INSUFFICIENT_HOLDINGS');
                    error.sqlState = '45000';
                    throw error;
                }
            }
        }

        const [result] = await connection.query(
            `INSERT INTO orders
                (user_id, asset_id, type, order_type, qty, filled_qty, reserved_cash, reserved_qty, limit_price, status)
             VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
            [userId, assetId, side, orderType, qty, reservedCash, reservedQty, limitPrice, 'OPEN']
        );

        await connection.commit();
        return result.insertId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export const updateOrderStatus = async (orderId, status) => {
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
};
