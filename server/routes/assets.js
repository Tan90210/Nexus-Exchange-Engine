import { Router } from 'express';
import verifyJWT from '../middleware/verifyJWT.js';
import * as PortfolioService from '../services/PortfolioService.js';

const router = Router();

router.use(verifyJWT);

router.get('/', async (req, res, next) => {
    try {
        const result = await PortfolioService.getAssets();
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

export default router;
