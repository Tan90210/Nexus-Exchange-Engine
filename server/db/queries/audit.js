import pool from '../pool.js';

const buildAuditWhereClause = (filters = {}) => {
    const conditions = [];
    const params = [];

    if (filters.userId) {
        conditions.push('le.user_id = ?');
        params.push(filters.userId);
    }

    if (filters.assetSymbol) {
        conditions.push('a.symbol = ?');
        params.push(filters.assetSymbol);
    }

    if (filters.dateFrom) {
        conditions.push('t.executed_at >= ?');
        params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
        conditions.push('t.executed_at <= ?');
        params.push(filters.dateTo);
    }

    return {
        whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
        params
    };
};

export const getAuditLogCount = async (filters = {}) => {
    const { whereClause, params } = buildAuditWhereClause(filters);
    const query = `
        SELECT COUNT(*) AS total
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
        ${whereClause}
    `;

    const [rows] = await pool.query(query, params);
    return rows[0]?.total ?? 0;
};

export const getAuditLogs = async (limit, offset, filters = {}) => {
    const { whereClause, params } = buildAuditWhereClause(filters);
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
            (
                al.tx_hash = SHA2(
                    CONCAT(t.id, '|', t.asset_id, '|', t.qty, '|', t.executed_price, '|', t.executed_at),
                    512
                )
            ) AS verified
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
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(query, [...params, limit, offset]);
    return rows;
};

export const getUserTradeHistory = async (userId, limit, filters = {}) => {
    const conditions = ['le.user_id = ?'];
    const params = [userId];

    if (filters.assetSymbol) {
        conditions.push('a.symbol = ?');
        params.push(filters.assetSymbol);
    }

    if (filters.dateFrom) {
        conditions.push('t.executed_at >= ?');
        params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
        conditions.push('t.executed_at <= ?');
        params.push(filters.dateTo);
    }

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
        WHERE ${conditions.join(' AND ')}
        ORDER BY t.executed_at DESC
        LIMIT ?
    `;

    const [rows] = await pool.query(query, [...params, limit]);
    return rows;
};
