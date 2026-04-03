import pool from '../db/pool.js';

class AuditService {
    /**
     * Retrieves paginated audit logs joined with trade and asset details.
     */
    static async getLogs(page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        const query = `
            SELECT 
                al.id as auditId,
                al.tx_hash,
                al.created_at,
                t.id as tradeId,
                t.qty,
                t.executed_price,
                a.symbol,
                a.name as assetName
            FROM audit_log al
            JOIN trades t ON al.trade_id = t.id
            JOIN assets a ON t.asset_id = a.id
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `;

        try {
            const [rows] = await pool.query(query, [Number(limit), Number(offset)]);
            return rows;
        } catch (error) {
            console.error('AuditService Error:', error);
            throw error;
        }
    }

    /**
     * Retrieves recent trade history for a specific user.
     */
    static async getUserTradeHistory(userId, limit = 50) {
        const query = `
            SELECT 
                t.*,
                a.symbol,
                le.entry_type,
                le.amount as total_value
            FROM trades t
            JOIN assets a ON t.asset_id = a.id
            JOIN ledger_entries le ON t.id = le.trade_id
            WHERE le.user_id = ?
            ORDER BY t.executed_at DESC
            LIMIT ?
        `;

        try {
            const [rows] = await pool.query(query, [userId, Number(limit)]);
            return rows;
        } catch (error) {
            console.error('AuditService Error:', error);
            throw error;
        }
    }
}

export default AuditService;
