import { Worker, Job, Queue } from 'bullmq';
import { SquareApiClient } from '../services/squareClient';
import { QuickBooksClient } from '../services/quickBooksClient';
import { OrderProcessor } from '../services/orderProcessor';
import { MappingEngine } from '../services/mapping';
import { SquareWebhookPayload } from '../schemas/webhookSchema';
import { metricsService } from '../services/metricsService';
import logger from '../services/logger';
import { getPrismaClient, disconnectPrisma } from '../services/db';
import config from '../config';
import auditService from '../services/auditService';

class OrderWorkerService {
  private worker: Worker;
  private queue: Queue;
  private prismaClient = getPrismaClient();
  private jobStartTimes: Map<string, number> = new Map();

  constructor() {
    const connectionConfig = {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      ...(config.REDIS_PASSWORD && {
        password: config.REDIS_PASSWORD,
      }),
      db: config.REDIS_DB,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    };

    // Initialize BullMQ queue for metrics monitoring
    this.queue = new Queue('order-processing', {
      connection: connectionConfig,
    });

    // Initialize BullMQ worker
    this.worker = new Worker(
      'order-processing',
      this.processOrderJob.bind(this),
      {
        connection: connectionConfig,
        concurrency: config.WORKER_CONCURRENCY, // Process up to 5 jobs concurrently
        limiter: {
          max: 10, // Maximum 10 jobs per duration
          duration: 60000, // 1 minute
        },
      }
    );

    this.setupEventHandlers();
    this.startQueueMonitoring();

    // Add Redis error handling to prevent crashes
    this.worker.on('error', err => {
      logger.error({ err }, 'Redis connection error in OrderWorker');
    });

    this.queue.on('error', err => {
      logger.error({ err }, 'Redis connection error in OrderWorker queue');
    });

    logger.info('OrderWorker started and listening for jobs');
  }

  /**
   * Process an order job from the queue
   */
  private async processOrderJob(job: Job<SquareWebhookPayload>): Promise<void> {
    const { data: webhookPayload } = job;
    const jobStartTime = Date.now();

    // Store job start time for duration calculation
    if (job.id) {
      this.jobStartTimes.set(job.id, jobStartTime);
    }

    logger.info(
      { jobId: job.id, orderId: webhookPayload.data.id },
      'Processing job'
    );

    // Record job as active
    metricsService.recordBullMQJob(
      'order-processing',
      'process-order',
      'active'
    );

    try {
      // Update job progress
      await job.updateProgress(10);

      // Initialize API clients with environment-based configuration
      const squareApiClient = new SquareApiClient({
        accessToken: config.SQUARE_ACCESS_TOKEN,
        applicationId: config.SQUARE_APPLICATION_ID,
        environment: config.SQUARE_ENVIRONMENT,
      });

      await job.updateProgress(20);

      const quickBooksClient = new QuickBooksClient({
        accessToken: config.QB_ACCESS_TOKEN,
        realmId: config.QB_REALM_ID,
        environment: config.QB_ENVIRONMENT,
      });

      await job.updateProgress(30);

      // Create MappingEngine with default strategy
      const mappingEngine = new MappingEngine();

      // Create OrderProcessor with initialized clients and mapping engine
      const orderProcessor = new OrderProcessor(
        squareApiClient,
        quickBooksClient,
        mappingEngine
      );

      await job.updateProgress(40);

      // Process the order
      await orderProcessor.processOrder(webhookPayload);

      await job.updateProgress(100);

      logger.info(
        { jobId: job.id, orderId: webhookPayload.data.id },
        'Successfully processed job'
      );
    } catch (error) {
      logger.error(
        {
          err: error,
          jobId: job.id,
          orderId: webhookPayload.data.id,
          attempt: job.attemptsMade,
          maxAttempts: job.opts.attempts,
        },
        'Failed to process job'
      );

      // Re-throw error to trigger BullMQ retry mechanism
      throw error;
    }
  }

  /**
   * Set up event handlers for monitoring and logging
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', job => {
      logger.info({ jobId: job.id }, 'Job completed successfully');

      // Calculate job duration and record metrics
      if (job.id) {
        const startTime = this.jobStartTimes.get(job.id);
        if (startTime) {
          const duration = (Date.now() - startTime) / 1000;
          metricsService.recordBullMQJob(
            'order-processing',
            'process-order',
            'completed',
            duration
          );
          this.jobStartTimes.delete(job.id);
        }

        // Record order processing success
        const strategy = 'default'; // Could be extracted from job data if needed
        metricsService.recordOrderProcessed('success', strategy);

        // Log audit event for successful order processing
        const webhookPayload = job.data as SquareWebhookPayload;
        auditService.logEvent({
          action: 'ORDER_PROCESSED',
          details: {
            jobId: job.id,
            orderId: webhookPayload.data.id,
            duration: startTime ? (Date.now() - startTime) / 1000 : undefined,
            strategy,
          },
        });
      }
    });

    this.worker.on('failed', (job, err) => {
      if (job) {
        logger.error({ jobId: job.id, err: err.message }, 'Job failed');

        // Calculate job duration and record metrics
        if (job.id) {
          const startTime = this.jobStartTimes.get(job.id);
          if (startTime) {
            const duration = (Date.now() - startTime) / 1000;
            metricsService.recordBullMQJob(
              'order-processing',
              'process-order',
              'failed',
              duration
            );
            this.jobStartTimes.delete(job.id);
          }

          // Record order processing failure
          const strategy = 'default'; // Could be extracted from job data if needed
          metricsService.recordOrderProcessed('failed', strategy);
        }

        // Log if this was the final attempt
        if (job.attemptsMade >= (job.opts.attempts || 1)) {
          logger.error({ jobId: job.id }, 'Job exhausted all retry attempts');

          // Log audit event for permanently failed job
          const webhookPayload = job.data as SquareWebhookPayload;
          auditService.logEvent({
            action: 'JOB_PERMANENTLY_FAILED',
            details: {
              jobId: job.id,
              orderId: webhookPayload.data.id,
              error: err.message,
              stack: err.stack,
              attempts: job.attemptsMade,
              maxAttempts: job.opts.attempts,
            },
          });

          // Here you could send alerts, write to dead letter queue, etc.
        }
      }
    });

    this.worker.on('progress', (job, progress) => {
      logger.debug({ jobId: job.id, progress }, 'Job progress update');
    });

    this.worker.on('stalled', jobId => {
      logger.warn({ jobId }, 'Job stalled');
    });

    this.worker.on('error', err => {
      logger.error({ err }, 'Worker error');
    });

    logger.info('OrderWorker event handlers configured');
  }

  /**
   * Start monitoring queue depth metrics
   */
  private startQueueMonitoring(): void {
    // Update queue metrics every 15 seconds
    setInterval(async () => {
      try {
        const queueCounts = await this.queue.getJobCounts();

        metricsService.updateQueueDepth(
          'order-processing',
          queueCounts['waiting'] || 0,
          queueCounts['active'] || 0,
          queueCounts['completed'] || 0,
          queueCounts['failed'] || 0
        );
      } catch (error) {
        logger.error({ err: error }, 'Error updating queue metrics');
      }
    }, 15000); // 15 seconds interval

    logger.info('Queue depth monitoring started (15s interval)');
  }

  /**
   * Graceful shutdown of the worker
   */
  async close(): Promise<void> {
    logger.info('Shutting down OrderWorker...');

    await this.worker.close();
    await this.queue.close();
    await disconnectPrisma();

    logger.info('OrderWorker shutdown complete');
  }
}

// Create and export the worker instance
const orderWorker = new OrderWorkerService();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down OrderWorker gracefully...');
  await orderWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down OrderWorker gracefully...');
  await orderWorker.close();
  process.exit(0);
});

export default orderWorker;
