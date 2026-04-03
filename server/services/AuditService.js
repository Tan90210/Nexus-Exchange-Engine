import {
    getAuditLogCount,
    getAuditLogs,
    getUserTradeHistory as getUserTradeHistoryQuery
} from '../db/queries/audit.js';

class AuditService {
    /**
     * Retrieves paginated audit logs joined with trade and asset details.
     */
    static async getLogs(page = 1, limit = 20) {
        const safePage = Number(page) > 0 ? Number(page) : 1;
        const safeLimit = Number(limit) > 0 ? Number(limit) : 20;
        const offset = (safePage - 1) * safeLimit;

        try {
            const [total, entries] = await Promise.all([
                getAuditLogCount(),
                getAuditLogs(safeLimit, offset)
            ]);

            return { total, entries };
        } catch (error) {
            console.error('AuditService Error:', error);
            throw error;
        }
    }

    /**
     * Retrieves recent trade history for a specific user.
     */
    static async getUserTradeHistory(userId, limit = 50) {
        try {
            return await getUserTradeHistoryQuery(userId, Number(limit));
        } catch (error) {
            console.error('AuditService Error:', error);
            throw error;
        }
    }
}

export default AuditService;
