import { executeTradeProcedure } from '../db/queries/trades.js';

class TradeService {
    /**
     * Executes a trade by calling the stored procedure.
     * Maps MySQL errors to meaningful business errors.
     */
    static async execute(userId, tradeData) {
        const { assetId, orderType, qty, limitPrice } = tradeData;
        const side = tradeData.type || tradeData.side;

        try {
            const result = await executeTradeProcedure(
                userId,
                assetId,
                side,
                orderType,
                qty,
                limitPrice || null
            );

            return {
                tradeId: result?.tradeId ?? result?.trade_id,
                status: 'COMMITTED',
                executedPrice: result?.executedPrice ?? result?.price,
                totalValue: result?.totalValue ?? result?.total
            };
        } catch (error) {
            console.error('TradeService Error:', error);

            if (error.errno === 1213) {
                const err = new Error('Deadlock detected');
                err.status = 503;
                err.payload = { error: 'DEADLOCK_DETECTED', retryAfter: 500 };
                throw err;
            }

            if (error.sqlState === '45000') {
                const message = error.message.toLowerCase();
                const err = new Error(error.message);
                err.status = 409;
                err.payload = {
                    error: message.includes('holding')
                        ? 'INSUFFICIENT_HOLDINGS'
                        : 'INSUFFICIENT_FUNDS'
                };
                throw err;
            }

            throw error;
        }
    }
}

export default TradeService;
