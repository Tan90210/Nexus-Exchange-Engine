import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

import errorHandler from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/auth.js';
import tradesRoutes from './routes/trades.js';
import portfolioRoutes from './routes/portfolio.js';
import auditRoutes from './routes/audit.js';
import adminRoutes from './routes/admin.js';
import assetsRoutes from './routes/assets.js';
import ordersRoutes from './routes/orders.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trades', tradesRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/orders', ordersRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
