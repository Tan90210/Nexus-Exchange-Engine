import { Router } from 'express';
import verifyJWT from '../middleware/verifyJWT.js';
import * as PortfolioService from '../services/PortfolioService.js';

const router = Router();

router.use(verifyJWT);

router.get('/', async (req, res, next) => {
    try {
        const result = await PortfolioService.getPortfolio(req.user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

router.get('/history', async (req, res, next) => {
    try {
        const { assetId, range } = req.query;

        const parsedAssetId = parseInt(assetId, 10);
        if (isNaN(parsedAssetId)) {
            const error = new Error('Invalid assetId');
            error.status = 400;
            throw error;
        }

        const result = await PortfolioService.getPriceHistory(parsedAssetId, range || '7d');
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

router.get('/assets', async (req, res, next) => {
    try {
        const result = await PortfolioService.getAssets();
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

router.get('/analytics', async (req, res, next) => {
    try {
        const result = await PortfolioService.getAnalytics();
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

router.get('/balance-history', async (req, res, next) => {
    try {
        const result = await PortfolioService.getRunningBalance(req.user.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

export default router;
