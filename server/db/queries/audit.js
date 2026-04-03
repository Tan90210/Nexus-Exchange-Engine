import pool from '../pool.js';

export const getAuditLogCount = async () => {
    const [rows] = await pool.query('SELECT COUNT(*) AS total FROM audit_log');
    return rows[0]?.total ?? 0;
};

export const getAuditLogs = async (limit, offset) => {
    const query = `
        SELECT
            al.id AS id,
            al.created_at AS timestamp,
            t.id AS tradeId,
            le.user_id AS userId,
            CASE
                WHEN le.entry_type = 'DEBIT' THEN 'BUY'
                ELSE 'SELL'
            END AS side,
            a.symbol AS assetSymbol,
            t.qty AS qty,
            t.executed_price AS price,
            al.tx_hash AS txHash,
            TRUE AS verified
        FROM audit_log al
        JOIN trades t ON al.trade_id = t.id
        JOIN assets a ON t.asset_id = a.id
        LEFT JOIN ledger_entries le ON le.id = (
            SELECT sub.id
            FROM ledger_entries sub
            WHERE sub.trade_id = t.id
            ORDER BY sub.id ASC
            LIMIT 1
        )
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(query, [limit, offset]);
    return rows;
};

export const getUserTradeHistory = async (userId, limit) => {
    const query = `
        SELECT
            t.id,
            t.qty,
            t.executed_price,
            t.executed_at,
            a.symbol,
            le.entry_type,
            le.amount AS total_value
        FROM trades t
        JOIN assets a ON t.asset_id = a.id
        JOIN ledger_entries le ON t.id = le.trade_id
        WHERE le.user_id = ?
        ORDER BY t.executed_at DESC
        LIMIT ?
    `;

    const [rows] = await pool.query(query, [userId, limit]);
    return rows;
};
