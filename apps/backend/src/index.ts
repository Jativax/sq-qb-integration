// Backend application entry point
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import type { Server } from 'http';
import webhookRoutes from './routes/webhooks';
import jobsRoutes from './routes/jobs';
import auditLogsRoutes from './routes/audit-logs';
import authRoutes from './routes/auth';
import analyticsRoutes from './routes/analytics';
import testRoutes from './routes/test';
import { metricsService } from './services/metricsService';
import { QueueService } from './services/queueService';
import { metricsMiddleware } from './middleware/metricsMiddleware';
import { accessLogMiddleware } from './middleware/accessLogMiddleware';
import logger from './services/logger';
import { getPrismaClient, disconnectPrisma } from './services/db';
import config, {
  HEALTH_PATH,
  METRICS_PATH,
  CORS_ORIGIN,
  CORS_CREDENTIALS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  WEBHOOK_RATE_LIMIT_MAX,
} from './config';
// Import the worker to start background job processing
import './workers/orderWorker';
import './workers/reconciliationWorker';

const app = express();
const prisma = getPrismaClient();
const { HOST, PORT } = config;

// Global references for graceful shutdown
let server: Server | null = null;
let queueService: QueueService | null = null;
let isShuttingDown = false;

// CORS Configuration
const corsOptions = {
  origin: CORS_ORIGIN ? CORS_ORIGIN.split(',').map(o => o.trim()) : false,
  credentials: CORS_CREDENTIALS,
  optionsSuccessStatus: 200, // Support legacy browsers
};

// Apply CORS
app.use(cors(corsOptions));

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

app.use(generalLimiter);

// Webhook-specific rate limiting (more permissive)
const webhookLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: WEBHOOK_RATE_LIMIT_MAX,
  message: {
    error: 'Webhook Rate Limit Exceeded',
    message: 'Too many webhook requests, please slow down.',
    retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    // Skip rate limiting for non-webhook endpoints
    return !req.path.includes('/webhooks');
  },
});

app.use('/api/v1/webhooks', webhookLimiter);

// Access logging middleware (before metrics to capture timing)
app.use(accessLogMiddleware);

// Metrics middleware (after access logging to capture all requests)
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

// Liveness probe - basic app availability (must be ultra-reliable for Docker healthcheck)
app.get(HEALTH_PATH, (req, res) => {
  // Always return 200 OK unless explicitly shutting down
  const status = isShuttingDown ? 503 : 200;
  const responseBody = {
    status: isShuttingDown ? 'shutting_down' : 'ok',
    timestamp: new Date().toISOString(),
  };

  res.status(status).json(responseBody);
});

// Prometheus metrics endpoint
app.get(METRICS_PATH, async (req, res) => {
  try {
    const metrics = await metricsService.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    logger.error({ err: error }, 'Error generating metrics');
    res.status(500).send('Error generating metrics');
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Square-QuickBooks Integration API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: HEALTH_PATH,
      metrics: METRICS_PATH,
    },
  });
});

// API routes
app.use('/api/v1/auth', authRoutes); // Public auth routes (login)
app.use('/api/v1/webhooks', webhookRoutes); // Will remain public for Square webhooks
app.use('/api/v1/jobs', jobsRoutes); // Protected with auth
app.use('/api/v1/audit-logs', auditLogsRoutes); // Protected with auth
app.use('/api/v1/analytics', analyticsRoutes); // Protected with auth - VIEWER role or higher
app.use('/api/test', testRoutes); // Test routes (consider removing in production)

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, forcing exit...');
    process.exit(1);
  }

  isShuttingDown = true;
  logger.warn({ signal }, 'Shutting down gracefully...');

  // Set a timeout for forced shutdown
  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 30000); // 30 seconds timeout

  try {
    // Close all resources in parallel with proper error handling
    const shutdownPromises = [
      // Close HTTP server
      server
        ? new Promise<void>(resolve => {
            server!.close(err => {
              if (err) {
                logger.error({ err }, 'Error closing HTTP server');
              } else {
                logger.info('HTTP server closed');
              }
              resolve();
            });
          })
        : Promise.resolve(),

      // Close queue service and workers
      queueService
        ? queueService.close().then(() => {
            logger.info('Queue service closed');
          })
        : Promise.resolve(),

      // Disconnect Prisma
      disconnectPrisma().then(() => {
        logger.info('Database disconnected');
      }),
    ];

    // Wait for all shutdown operations to complete
    await Promise.allSettled(shutdownPromises);

    clearTimeout(shutdownTimeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    clearTimeout(shutdownTimeout);
    logger.error({ err: error }, 'Error during shutdown');
    process.exit(1);
  }
};

/**
 * Start the application server
 */
async function startServer(): Promise<void> {
  try {
    logger.info('SQ-QB Integration Backend starting...');

    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Initialize queue service
    queueService = new QueueService();
    await queueService.scheduleReconciliationJob();
    logger.info('Queue service initialized and reconciliation job scheduled');

    // Log available models
    logger.info(
      'Available models: SquareOrder (raw Square order data), QuickBooksReceipt (QB receipts with 1:1 relationship), SyncJob (processing jobs)'
    );

    // Start the Express server
    server = app.listen(PORT, HOST, () => {
      logger.info({ host: HOST, port: PORT }, 'Server running');
      logger.info(
        { endpoint: '/api/v1/webhooks/square' },
        'API Documentation available'
      );
      logger.info(
        { endpoint: METRICS_PATH, port: PORT },
        'Prometheus metrics available'
      );
      logger.info(
        { liveness: HEALTH_PATH },
        'Health check endpoints available'
      );
      logger.info('Background job worker started for order processing');
      logger.info('Ready to process Square to QuickBooks integrations!');
    });

    // Handle server errors
    server.on('error', error => {
      logger.error({ err: error }, 'Server error');
      if (!isShuttingDown) {
        gracefulShutdown('SERVER_ERROR');
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Application startup failed');
    process.exit(1);
  }
}

// Register shutdown handlers
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => gracefulShutdown(signal));
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', error => {
  logger.fatal({ err: error }, 'Uncaught exception');
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'Unhandled rejection');
  gracefulShutdown('UNHANDLED_REJECTION');
});

startServer().catch(error => {
  logger.error({ err: error }, 'Application failed to start');
  process.exit(1);
});
