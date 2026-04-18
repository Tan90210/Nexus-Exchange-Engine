import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByEmail, createUser, depositFundsProcedure, withdrawFundsProcedure } from '../db/queries/users.js';

export const register = async (email, password, name) => {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
        const error = new Error('Email already exists');
        error.status = 409;
        throw error;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userId = await createUser(email, passwordHash, name);

    const token = jwt.sign(
        { id: userId, email, role: 'USER' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    return {
        token,
        user: { id: userId, email, name, role: 'USER' }
    };
};

export const login = async (email, password) => {
    const user = await findUserByEmail(email);

    if (!user) {
        const error = new Error('Invalid email or password');
        error.status = 401;
        throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
        const error = new Error('Invalid email or password');
        error.status = 401;
        throw error;
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    return {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
    };
};

export const deposit = async (userId, amount) => {
    const result = await depositFundsProcedure(userId, amount);
    // depositFundsProcedure returns rows[0][0] from pool.query — unwrap the balance scalar
    return result?.newBalance ?? result?.NewBalance ?? result;
};

export const withdraw = async (userId, amount) => {
    try {
        const result = await withdrawFundsProcedure(userId, amount);
        return result?.newBalance ?? result?.NewBalance ?? result;
    } catch (error) {
        if (error.sqlState === '45000') {
            const err = new Error(error.message);
            err.status = 400; // INSUFFICIENT_FUNDS or INVALID_AMOUNT
            throw err;
        }
        throw error;
    }
};
