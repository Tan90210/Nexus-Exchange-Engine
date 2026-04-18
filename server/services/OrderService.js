import * as OrderQueries from '../db/queries/orders.js';

class OrderService {
    static async cancelOrder(userId, orderId) {
        // First verify ownership — getUserOrders already returns the rows array directly
        const orders = await OrderQueries.getUserOrders(userId, 100);
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            const err = new Error('Order not found or unauthorized');
            err.status = 404;
            throw err;
        }

        if (order.status !== 'OPEN') {
            const err = new Error('Only OPEN orders can be cancelled');
            err.status = 400;
            throw err;
        }

        try {
            return await OrderQueries.cancelOrderProcedure(orderId);
        } catch (error) {
            console.error('OrderService.cancelOrder Error:', error);
            if (error.sqlState === '45000') {
                const err = new Error(error.message);
                err.status = 400;
                throw err;
            }
            throw error;
        }
    }

    static async getOrderBook(assetId) {
        return await OrderQueries.getOrderBookProcedure(assetId);
    }
}

export default OrderService;
