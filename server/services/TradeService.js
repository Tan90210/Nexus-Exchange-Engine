import pool from '../db/pool.js';

class TradeService {
    /**
     * Executes a trade by calling the stored procedure.
     * Maps MySQL errors to meaningful business errors.
     */
    static async execute(userId, tradeData) {
        const { assetId, side, orderType, qty, limitPrice } = tradeData;

        try {
            // Call the stored procedure:
            // CALL execute_trade(p_user_id, p_asset_id, p_side, p_order_type, p_qty, p_limit_price)
            const [rows] = await pool.query(
                'CALL execute_trade(?, ?, ?, ?, ?, ?)',
                [userId, assetId, side, orderType, qty, limitPrice || null]
            );

            // The procedure returns the trade results in the first element of the rows array
            return rows[0][0];
        } catch (error) {
            console.error('TradeService Error:', error);

            // Map MySQL Error 1213 (Deadlock) to a specific status
            if (error.errno === 1213) {
                const err = new Error('System busy. Please try again.');
                err.status = 503;
                throw err;
            }

            // Map custom SIGNAL messages
            if (error.sqlState === '45000') {
                const err = new Error(error.message);
                err.status = 409; // Conflict/Business rule violation
                throw err;
            }

            throw error;
        }
    }
}

export default TradeService;
