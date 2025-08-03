// Backend application entry point
import express from 'express';
import cors from 'cors';
import webhookRoutes from './routes/webhooks';
import jobsRoutes from './routes/jobs';
import auditLogsRoutes from './routes/audit-logs';
import authRoutes from './routes/auth';
import analyticsRoutes from './routes/analytics';
import testRoutes from './routes/test';
import { metricsService } from './services/metricsService';
import { metricsMiddleware } from './middleware/metricsMiddleware';
import logger from './services/logger';
import { getPrismaClient, disconnectPrisma } from './services/db';
import config from './config';
// Import the worker to start background job processing
import './workers/orderWorker';

const app = express();
const prisma = getPrismaClient();
const { PORT } = config;

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
    logger.error({ err: error }, 'Error generating metrics');
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
app.use('/api/v1/auth', authRoutes); // Public auth routes (login)
app.use('/api/v1/webhooks', webhookRoutes); // Will remain public for Square webhooks
app.use('/api/v1/jobs', jobsRoutes); // Protected with auth
app.use('/api/v1/audit-logs', auditLogsRoutes); // Protected with auth
app.use('/api/v1/analytics', analyticsRoutes); // Protected with auth - VIEWER role or higher
app.use('/api/test', testRoutes); // Test routes (consider removing in production)

async function startServer(): Promise<void> {
  try {
    logger.info('SQ-QB Integration Backend starting...');

    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Log available models
    logger.info(
      'Available models: SquareOrder (raw Square order data), QuickBooksReceipt (QB receipts with 1:1 relationship), SyncJob (processing jobs)'
    );

    // Start the Express server
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server running');
      logger.info(
        { endpoint: '/api/v1/webhooks/square' },
        'API Documentation available'
      );
      logger.info(
        { endpoint: `/metrics`, port: PORT },
        'Prometheus metrics available'
      );
      logger.info('Background job worker started for order processing');
      logger.info('Ready to process Square to QuickBooks integrations!');
    });
  } catch (error) {
    logger.error({ err: error }, 'Application startup failed');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await disconnectPrisma();
  process.exit(0);
});

startServer().catch(error => {
  logger.error({ err: error }, 'Application failed to start');
  process.exit(1);
});
