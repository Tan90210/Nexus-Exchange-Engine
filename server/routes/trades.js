import express from 'express';
import { z } from 'zod';
import verifyJWT from '../middleware/verifyJWT.js';
import TradeService from '../services/TradeService.js';

const router = express.Router();

router.use(verifyJWT);

const tradeSchema = z.object({
    assetId: z.number().int().positive(),
    type: z.enum(['BUY', 'SELL']).optional(),
    side: z.enum(['BUY', 'SELL']).optional(),
    orderType: z.enum(['MARKET', 'LIMIT']),
    qty: z.number().positive(),
    limitPrice: z.number().positive().nullable().optional()
}).refine((data) => data.type || data.side, {
    message: 'Trade side is required',
    path: ['type']
});

/**
 * POST /api/trades
 * Body: { assetId, side, orderType, qty, limitPrice }
 */
router.post('/', async (req, res, next) => {
    try {
        const payload = tradeSchema.parse(req.body);
        const result = await TradeService.execute(req.userId, payload);
        res.status(200).json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues[0]?.message || 'Invalid trade request' });
        }
        next(error);
    }
});

export default router;
