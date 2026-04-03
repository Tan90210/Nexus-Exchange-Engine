import { Router } from 'express';
import { z } from 'zod';
import * as UserService from '../services/UserService.js';

const router = Router();

// Validation schemas
const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(1, 'Name is required')
});

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
});

router.post('/register', async (req, res, next) => {
    try {
        const { email, password, name } = registerSchema.parse(req.body);
        const result = await UserService.register(email, password, name);
        res.status(200).json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        next(error);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const result = await UserService.login(email, password);
        res.status(200).json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        next(error);
    }
});

export default router;
