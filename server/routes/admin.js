import express from 'express';
import verifyAdmin from '../middleware/verifyAdmin.js';
import verifyJWT from '../middleware/verifyJWT.js';
import pool from '../db/pool.js';
import { deposit, withdraw } from '../services/UserService.js';
import { z } from 'zod';

const router = express.Router();

router.use(verifyJWT);
router.use(verifyAdmin);

/**
 * GET /api/admin/stats
 * System-wide stats (health, pools, etc.)
 */
router.get('/stats', async (req, res, next) => {
    try {
        const internalPool = pool;
        const totalConnections = internalPool?._allConnections?.length ?? null;
        const idleConnections = internalPool?._freeConnections?.length ?? null;
        const activeConnections =
            totalConnections != null && idleConnections != null
                ? totalConnections - idleConnections
                : null;

        res.json({
            status: 'HEALTHY',
            uptime: process.uptime(),
            connections: activeConnections,
            idleConnections,
            timestamp: new Date()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/locks
 * Directly queries INFORMATION_SCHEMA for active InnoDB transactions
 */
router.get('/locks', async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                trx_id, 
                trx_state, 
                trx_started, 
                trx_mysql_thread_id, 
                trx_query 
            FROM INFORMATION_SCHEMA.INNODB_TRX
            ORDER BY trx_started DESC
        `);
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

const fundsSchema = z.object({
    userId: z.number().int().positive(),
    amount: z.number().positive()
});

/**
 * POST /api/admin/deposit
 * Admin deposits funds for user
 */
router.post('/deposit', async (req, res, next) => {
    try {
        const { userId, amount } = fundsSchema.parse(req.body);
        const result = await deposit(userId, amount);
        res.json({ success: true, newBalance: result });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues[0]?.message || 'Invalid request' });
        }
        next(error);
    }
});

/**
 * POST /api/admin/withdraw
 * Admin withdraws funds from user
 */
router.post('/withdraw', async (req, res, next) => {
    try {
        const { userId, amount } = fundsSchema.parse(req.body);
        const result = await withdraw(userId, amount);
        res.json({ success: true, newBalance: result });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues[0]?.message || 'Invalid request' });
        }
        next(error);
    }
});

export default router;
