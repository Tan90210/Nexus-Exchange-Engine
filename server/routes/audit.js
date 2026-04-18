import express from 'express';
import verifyJWT from '../middleware/verifyJWT.js';
import AuditService from '../services/AuditService.js';

const router = express.Router();

router.use(verifyJWT);

/**
 * GET /api/audit
 * Query params: page, limit
 */
router.get('/', async (req, res, next) => {
    try {
        const { page, limit, userId, assetSymbol, dateFrom, dateTo } = req.query;
        const logs = await AuditService.getLogs(page, limit, {
            userId: userId ? Number(userId) : undefined,
            assetSymbol,
            dateFrom,
            dateTo
        });
        res.json(logs);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/audit/history
 * Query params: limit
 */
router.get('/history', async (req, res, next) => {
    try {
        const { limit, assetSymbol, dateFrom, dateTo } = req.query;
        const history = await AuditService.getUserTradeHistory(req.user.id, limit, {
            assetSymbol,
            dateFrom,
            dateTo
        });
        res.json(history);
    } catch (error) {
        next(error);
    }
});

export default router;
