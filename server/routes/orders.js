import express from 'express';
import { z } from 'zod';
import verifyJWT from '../middleware/verifyJWT.js';
import OrderService from '../services/OrderService.js';
import * as OrderQueries from '../db/queries/orders.js';

const router = express.Router();

router.use(verifyJWT);

const cancelSchema = z.object({
    orderId: z.number().int().positive()
});

/**
 * POST /api/orders/cancel
 * Body: { orderId: 123 }
 */
router.post('/cancel', async (req, res, next) => {
    try {
        const { orderId } = cancelSchema.parse(req.body);
        const result = await OrderService.cancelOrder(req.user.id, orderId);
        res.status(200).json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues[0]?.message || 'Invalid request' });
        }
        next(error);
    }
});

/**
 * GET /api/orders/book/:assetId
 */
router.get('/book/:assetId', async (req, res, next) => {
    try {
        const assetId = parseInt(req.params.assetId, 10);
        if (isNaN(assetId)) {
            return res.status(400).json({ error: 'Invalid asset ID' });
        }
        const result = await OrderService.getOrderBook(assetId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/orders/my
 * Returns the current user's order history (for order management panel)
 */
router.get('/my', async (req, res, next) => {
    try {
        const orders = await OrderQueries.getUserOrders(req.user.id, 50);
        res.status(200).json(orders);
    } catch (error) {
        next(error);
    }
});

export default router;
