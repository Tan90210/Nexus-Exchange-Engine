import {
    executeTradeProcedure,
    settlePartialTradeProcedure,
    findMatchingOrder,
    createOrder,
    updateOrderStatus
} from '../db/queries/trades.js';
import { getAssetById } from '../db/queries/portfolio.js';

class TradeService {
    /**
     * Executes a trade by calling the stored procedure.
     * Maps MySQL errors to meaningful business errors.
     */
    static async execute(userId, tradeData) {
        const { assetId, orderType, qty, limitPrice } = tradeData;
        const side = tradeData.type || tradeData.side;

        try {
            // 1. Create our order as OPEN first
            const matchPrice = orderType === 'LIMIT' ? limitPrice : null;
            const myOrderId = await createOrder(userId, assetId, side, orderType, qty, limitPrice);

            // 2. Find a matching counter-order
            const match = await findMatchingOrder(assetId, side, qty, matchPrice);

            if (match) {
                // 3. Determine executed price:
                //    Priority: our limit price → matched order's limit price → live asset price
                //    This prevents the ₹0 bug when both sides are MARKET orders.
                let executedPrice = matchPrice || match.limit_price || null;
                if (!executedPrice || executedPrice <= 0) {
                    const asset = await getAssetById(assetId);
                    executedPrice = asset?.current_price ?? 0;
                }
                executedPrice = parseFloat(executedPrice);

                const matchRemaining = parseFloat(match.qty) - parseFloat(match.filled_qty || 0);
                const fillQty = Math.min(parseFloat(qty), matchRemaining);

                const buyOrderId = side === 'BUY' ? myOrderId : match.id;
                const sellOrderId = side === 'SELL' ? myOrderId : match.id;

                let tradeId;

                // Full fill — both orders completely satisfy each other
                if (fillQty === parseFloat(qty) && fillQty === matchRemaining) {
                    const result = await executeTradeProcedure(buyOrderId, sellOrderId, assetId, fillQty, executedPrice);
                    tradeId = result?.tradeId ?? result?.trade_id;
                } else {
                    const result = await settlePartialTradeProcedure(buyOrderId, sellOrderId, assetId, fillQty, executedPrice);
                    tradeId = result?.tradeId ?? result?.trade_id;
                }

                return {
                    tradeId,
                    status: fillQty === qty ? 'FILLED' : 'PARTIALLY_FILLED',
                    executedPrice: executedPrice,
                    totalValue: executedPrice * fillQty
                };
            } else {
                if (orderType === 'MARKET') {
                    await updateOrderStatus(myOrderId, 'CANCELLED');
                    return {
                        orderId: myOrderId,
                        status: 'UNFILLED',
                        message: 'Market order cancelled because no matching liquidity was available.'
                    };
                }

                return {
                    orderId: myOrderId,
                    status: 'OPEN',
                    message: 'Order placed but no immediate match found. Waiting in order book.'
                };
            }
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
