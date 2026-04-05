import {
    executeTradeProcedure,
    settlePartialTradeProcedure,
    findMatchingOrder,
    createOrder,
    updateOrderStatus
} from '../db/queries/trades.js';
import pool from '../db/pool.js';

class TradeService {
    /**
     * Executes a trade by calling the stored procedure.
     * Maps MySQL errors to meaningful business errors.
     */
    static async execute(userId, tradeData) {
        console.log('TradeService.execute Trace - userId:', userId, 'tradeData:', tradeData);
        const { assetId, orderType, qty, limitPrice } = tradeData;
        const side = tradeData.type || tradeData.side;

        try {
            // 1. Try to find a matching counter-order
            const matchPrice = orderType === 'LIMIT' ? limitPrice : null;
            console.log('TradeService check match:', { assetId, side, qty, matchPrice });

            // We insert our order first as OPEN regardless
            const myOrderId = await createOrder(userId, assetId, side, orderType, qty, limitPrice);

            const match = await findMatchingOrder(assetId, side, qty, matchPrice);
            console.log('TradeService match result:', match);

            if (match) {
                // 2. Perform a real peer-to-peer trade
                const matchRemaining = match.qty - (match.filled_qty || 0);
                const fillQty = Math.min(qty, matchRemaining);

                const buyerId = side === 'BUY' ? userId : match.user_id;
                const sellerId = side === 'SELL' ? userId : match.user_id;
                const buyOrderId = side === 'BUY' ? myOrderId : match.id;
                const sellOrderId = side === 'SELL' ? myOrderId : match.id;

                const executedPrice = matchPrice || match.limit_price || match.executed_price || 0; // fallback but limit_price is best

                let tradeId;

                // If both orders fully match each other exactly
                if (fillQty === qty && fillQty === matchRemaining) {
                    const result = await executeTradeProcedure(buyOrderId, sellOrderId, assetId, fillQty, executedPrice);
                    tradeId = result?.tradeId ?? result?.trade_id;

                    // The actual execute_trade stored procedure now automatically links the trade to the orders
                    // and updates both order statuses to FILLED. No manual application-layer updates needed!
                } else {
                    // Partial fill - use the new procedure that handles order linkages and statuses internally
                    // Wait, my settlePartialTradeProcedure implementation only marked sell_order_id as FILLED fully. 
                    // To handle generically, we will modify the JS to update statuses where needed just in case.
                    const result = await settlePartialTradeProcedure(buyOrderId, sellOrderId, assetId, fillQty, executedPrice);
                    tradeId = result?.tradeId ?? result?.trade_id;
                    
                    // Update myOrderId filled_qty
                    await pool.query('UPDATE orders SET filled_qty = COALESCE(filled_qty, 0) + ? WHERE id = ?', [fillQty, myOrderId]);
                    await pool.query('UPDATE orders SET status = IF(qty <= COALESCE(filled_qty, 0), "FILLED", "OPEN") WHERE id = ?', [myOrderId]);
                    
                    // Update matchOrderId filled_qty
                    await pool.query('UPDATE orders SET filled_qty = COALESCE(filled_qty, 0) + ? WHERE id = ?', [fillQty, match.id]);
                    await pool.query('UPDATE orders SET status = IF(qty <= COALESCE(filled_qty, 0), "FILLED", "OPEN") WHERE id = ?', [match.id]);
                }

                return {
                    tradeId,
                    status: fillQty === qty ? 'FILLED' : 'PARTIALLY_FILLED',
                    executedPrice: executedPrice,
                    totalValue: executedPrice * fillQty
                };
            } else {
                // 3. No match found, order was already placed as OPEN
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
