import express from 'express';
import verifyJWT from '../middleware/verifyJWT.js';
import pool from '../db/pool.js';

const router = express.Router();

router.use(verifyJWT);

/**
 * GET /api/admin/stats
 * System-wide stats (health, pools, etc.)
 */
router.get('/stats', async (req, res, next) => {
    try {
        // Simple health check and pool stats
        res.json({
            status: 'HEALTHY',
            uptime: process.uptime(),
            connections: pool.pool.activeConnections,
            idleConnections: pool.pool.idleConnections,
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

export default router;
