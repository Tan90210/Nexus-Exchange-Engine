import express from 'express';
import verifyJWT from '../middleware/verifyJWT.js';
import TradeService from '../services/TradeService.js';

const router = express.Router();

router.use(verifyJWT);

/**
 * POST /api/trades
 * Body: { assetId, side, orderType, qty, limitPrice }
 */
router.post('/', async (req, res, next) => {
    try {
        const result = await TradeService.execute(req.userId, req.body);
        res.status(201).json(result);
    } catch (error) {
        // Business logic errors (409) or Deadlocks (503) handled by errorHandler.js
        // but status code is attached in TradeService
        next(error);
    }
});

export default router;
