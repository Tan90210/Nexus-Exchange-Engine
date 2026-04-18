import * as PortfolioQueries from '../db/queries/portfolio.js';

export const getPortfolio = async (userId) => {
    const [holdingsRaw, cashBalanceStr, dailyChangeRaw] = await Promise.all([
        PortfolioQueries.getPortfolioMtm(userId),
        PortfolioQueries.getCashBalance(userId),
        PortfolioQueries.getPortfolioDailyChange(userId)
    ]);

    const cashBalance = parseFloat(cashBalanceStr) || 0;

    let totalMtm = 0;
    let totalUnrealizedPnl = 0;

    const holdings = holdingsRaw.map(h => {
        const marketValue = parseFloat(h.market_value) || 0;
        const unrealizedPnl = parseFloat(h.unrealized_pnl) || 0;
        
        totalMtm += marketValue;
        totalUnrealizedPnl += unrealizedPnl;

        return {
            assetId: h.asset_id,
            symbol: h.symbol,
            name: h.name,
            qty: parseFloat(h.quantity),
            availableQty: parseFloat(h.available_quantity ?? h.quantity),
            avgCostBasis: parseFloat(h.avg_cost_basis),
            currentPrice: parseFloat(h.current_price),
            marketValue: marketValue,
            unrealizedPnl: unrealizedPnl,
            pnlPct: parseFloat(h.pnl_pct) || 0
        };
    });

    return {
        cashBalance,
        totalMtm,
        unrealizedPnl: totalUnrealizedPnl,
        dailyChange: parseFloat(dailyChangeRaw) || 0,
        holdings
    };
};

export const getPriceHistory = async (assetId, range) => {
    let days = 7;
    if (range) {
        const parsed = parseInt(range.replace('d', ''), 10);
        if (!isNaN(parsed)) {
            days = parsed;
        }
    }

    const [pricesRaw, asset] = await Promise.all([
        PortfolioQueries.getPriceHistory(assetId, days),
        PortfolioQueries.getAssetById(assetId)
    ]);

    if (!asset) {
        const error = new Error('Asset not found');
        error.status = 404;
        throw error;
    }

    const prices = pricesRaw.map(p => {
        const dateObj = new Date(p.recorded_at);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        
        return {
            date: `${yyyy}-${mm}-${dd}`,
            price: parseFloat(p.price)
        };
    });

    return {
        assetId,
        symbol: asset.symbol,
        name: asset.name,
        prices
    };
};

export const getAssets = async () => {
    const assets = await PortfolioQueries.getAllAssets();

    return assets.map((asset) => ({
        assetId: asset.assetId,
        symbol: asset.symbol,
        name: asset.name,
        currentPrice: parseFloat(asset.currentPrice)
    }));
};

export const getAnalytics = async () => {
    const [
        pnlSummary,
        assetVolume,
        tradeSummary,
        exchangeWeight,
        openOrders,
        wacData
    ] = await Promise.all([
        PortfolioQueries.getUserPnlSummary(),
        PortfolioQueries.getAssetVolume(),
        PortfolioQueries.getUserTradeSummary(),
        PortfolioQueries.getUserExchangeWeight(),
        PortfolioQueries.getOpenOrders(),
        PortfolioQueries.getWacData()
    ]);

    return {
        pnlSummary,
        assetVolume,
        tradeSummary,
        exchangeWeight,
        openOrders,
        wacData
    };
};

export const getRunningBalance = async (userId) => {
    return await PortfolioQueries.getRunningBalance(userId);
};

export const updateAssetPrice = async (assetId, newPrice) => {
    return await PortfolioQueries.updateAssetPrice(assetId, newPrice);
};
