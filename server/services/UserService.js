import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByEmail, createUser } from '../db/queries/users.js';

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
        { id: userId, email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    return {
        token,
        user: { id: userId, email, name }
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
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    return {
        token,
        user: { id: user.id, email: user.email, name: user.name }
    };
};
