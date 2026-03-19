import express from 'express';
import morgan from 'morgan';
import { config } from './config/index.js';
import { connectDB } from './config/database.js';
import { applySecurityMiddleware } from './middleware/security.middleware.js';
import authRoutes from './routes/auth.routes.js';
import interviewRoutes from './routes/interview.routes.js';
import cheatRoutes from './routes/cheat.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render load balancer)

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
}

// Security
applySecurityMiddleware(app);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/cheat', cheatRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'AI Interview Analyzer API is running 🚀' });
});

// 404 handler
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('❌ Error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error', error: config.nodeEnv === 'development' ? err.message : undefined });
});

// Start server
const startServer = async () => {
    await connectDB();
    app.listen(config.port, () => {
        console.log(`🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });
};

startServer().catch(console.error);

export default app;
