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

            let remainingQtyToFill = parseFloat(qty);
            let totalExecutedValue = 0;
            let lastExecutedPrice = 0;
            let tradeIds = [];

            while (remainingQtyToFill > 0) {
                // 2. Find a matching counter-order
                const match = await findMatchingOrder(assetId, side, remainingQtyToFill, matchPrice);

                if (!match) {
                    // No more liquidity at our price
                    break;
                }

                // 3. Determine executed price:
                //    Priority: our limit price → matched order's limit price → live asset price
                let executedPrice = matchPrice || match.limit_price || null;
                if (!executedPrice || executedPrice <= 0) {
                    const asset = await getAssetById(assetId);
                    executedPrice = asset?.current_price ?? 0;
                }
                executedPrice = parseFloat(executedPrice);

                const matchRemaining = parseFloat(match.qty) - parseFloat(match.filled_qty || 0);
                const fillQty = Math.min(remainingQtyToFill, matchRemaining);

                const buyOrderId = side === 'BUY' ? myOrderId : match.id;
                const sellOrderId = side === 'SELL' ? myOrderId : match.id;

                let tradeId;

                const myTotalQty = parseFloat(qty);
                const matchTotalQty = parseFloat(match.qty);

                // Full fill — both orders completely satisfy each other cleanly on the first pass
                if (fillQty === myTotalQty && fillQty === matchTotalQty && remainingQtyToFill === myTotalQty) {
                    const result = await executeTradeProcedure(buyOrderId, sellOrderId, assetId, fillQty, executedPrice);
                    tradeId = result?.tradeId ?? result?.trade_id;
                } else {
                    const result = await settlePartialTradeProcedure(buyOrderId, sellOrderId, assetId, fillQty, executedPrice);
                    tradeId = result?.tradeId ?? result?.trade_id;
                }

                tradeIds.push(tradeId);
                totalExecutedValue += (executedPrice * fillQty);
                lastExecutedPrice = executedPrice;
                remainingQtyToFill -= fillQty;
            }

            if (tradeIds.length > 0) {
                if (remainingQtyToFill > 0 && orderType === 'MARKET') {
                    await updateOrderStatus(myOrderId, 'CANCELLED');
                }

                return {
                    tradeId: tradeIds[0], // Return first tradeId for backwards compatibility
                    tradeIds: tradeIds,
                    status: remainingQtyToFill === 0 ? 'FILLED' : 'PARTIALLY_FILLED',
                    executedPrice: lastExecutedPrice,
                    totalValue: totalExecutedValue
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
