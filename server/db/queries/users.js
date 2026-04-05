import pool from '../pool.js';

export const findUserByEmail = async (email) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows.length ? rows[0] : null;
};

export const createUser = async (email, passwordHash, name) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
            [email, passwordHash, name]
        );
        const userId = result.insertId;

        await connection.query(
            'INSERT INTO wallets (user_id, balance) VALUES (?, 100000)',
            [userId]
        );

        await connection.commit();
        return userId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export const depositFundsProcedure = async (userId, amount) => {
    const [rows] = await pool.query('CALL deposit_funds(?, ?)', [userId, amount]);
    return rows[0]?.[0] ?? null;
};

export const withdrawFundsProcedure = async (userId, amount) => {
    const [rows] = await pool.query('CALL withdraw_funds(?, ?)', [userId, amount]);
    return rows[0]?.[0] ?? null;
};
