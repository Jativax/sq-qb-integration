// Backend application entry point
import express from 'express';
import cors from 'cors';
import prisma from './services/db';
import webhookRoutes from './routes/webhooks';
import jobsRoutes from './routes/jobs';
import testRoutes from './routes/test';
import { metricsService } from './services/metricsService';
import { metricsMiddleware } from './middleware/metricsMiddleware';
import logger from './services/logger';
import config from './services/config';
// Import the worker to start background job processing
import './workers/orderWorker';

const app = express();
const PORT = config.port;

// Middleware
app.use(cors());

// Metrics middleware (before other middleware to capture all requests)
app.use(metricsMiddleware);

// Configure express.json() with verify option to save raw buffer for signature validation
app.use(
  express.json({
    verify: (req: express.Request & { rawBody?: Buffer }, res, buf) => {
      // Attach the raw buffer to the request object for signature validation
      req.rawBody = buf;
    },
  })
);

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    logger.error({ err: error }, '❌ Error generating metrics');
    res.status(500).send('Error generating metrics');
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Square-QuickBooks Integration API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/test', testRoutes);

async function startServer(): Promise<void> {
  try {
    logger.info('🚀 SQ-QB Integration Backend starting...');

    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Log available models
    logger.info('📊 Available models:');
    logger.info('   - SquareOrder: Store raw Square order data');
    logger.info(
      '   - QuickBooksReceipt: Track QB receipts with 1:1 relationship'
    );
    logger.info('   - SyncJob: Manage processing jobs');

    // Start the Express server
    app.listen(PORT, () => {
      logger.info(`🌐 Server running on http://localhost:${PORT}`);
      logger.info(`📋 API Documentation: /api/v1/webhooks/square`);
      logger.info(`📊 Prometheus metrics: http://localhost:${PORT}/metrics`);
      logger.info('🔄 Background job worker started for order processing');
      logger.info('🎯 Ready to process Square to QuickBooks integrations!');
    });
  } catch (error) {
    logger.error({ err: error }, '❌ Application startup failed');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer().catch(error => {
  logger.error({ err: error }, 'Application failed to start');
  process.exit(1);
});
