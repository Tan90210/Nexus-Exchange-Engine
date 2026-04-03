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
        const { page, limit } = req.query;
        const logs = await AuditService.getLogs(page, limit);
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
        const { limit } = req.query;
        const history = await AuditService.getUserTradeHistory(req.userId, limit);
        res.json(history);
    } catch (error) {
        next(error);
    }
});

export default router;
