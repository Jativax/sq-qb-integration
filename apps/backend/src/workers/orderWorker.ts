import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { SquareApiClient } from '../services/squareClient';
import { QuickBooksClient } from '../services/quickBooksClient';
import { OrderProcessor } from '../services/orderProcessor';
import { MappingEngine } from '../services/mapping';
import { SquareWebhookPayload } from '../schemas/webhookSchema';
import { metricsService } from '../services/metricsService';

class OrderWorkerService {
  private worker: Worker;
  private queue: Queue;
  private prismaClient: PrismaClient;
  private jobStartTimes: Map<string, number> = new Map();

  constructor() {
    // Initialize Prisma client
    this.prismaClient = new PrismaClient();

    const connectionConfig = {
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379'),
      ...(process.env['REDIS_PASSWORD'] && {
        password: process.env['REDIS_PASSWORD'],
      }),
      db: parseInt(process.env['REDIS_DB'] || '0'),
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
        concurrency: parseInt(process.env['WORKER_CONCURRENCY'] || '5'), // Process up to 5 jobs concurrently
        limiter: {
          max: 10, // Maximum 10 jobs per duration
          duration: 60000, // 1 minute
        },
      }
    );

    this.setupEventHandlers();
    this.startQueueMonitoring();
    console.log('🔄 OrderWorker started and listening for jobs');
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

    console.log(
      `🔄 Processing job ${job.id} for order ${webhookPayload.data.id}`
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
        accessToken: process.env['SQUARE_ACCESS_TOKEN'] || 'test-square-token',
        applicationId: process.env['SQUARE_APPLICATION_ID'] || 'test-app-id',
        environment:
          (process.env['SQUARE_ENVIRONMENT'] as 'sandbox' | 'production') ||
          'sandbox',
      });

      await job.updateProgress(20);

      const quickBooksClient = new QuickBooksClient({
        accessToken: process.env['QB_ACCESS_TOKEN'] || 'test-qb-token',
        realmId: process.env['QB_REALM_ID'] || 'test-realm-123',
        environment:
          (process.env['QB_ENVIRONMENT'] as 'sandbox' | 'production') ||
          'sandbox',
      });

      await job.updateProgress(30);

      // Create MappingEngine with default strategy
      const mappingEngine = new MappingEngine();

      // Create OrderProcessor with initialized clients and mapping engine
      const orderProcessor = new OrderProcessor(
        this.prismaClient,
        squareApiClient,
        quickBooksClient,
        mappingEngine
      );

      await job.updateProgress(40);

      // Process the order
      await orderProcessor.processOrder(webhookPayload);

      await job.updateProgress(100);

      console.log(
        `✅ Successfully processed job ${job.id} for order ${webhookPayload.data.id}`
      );
    } catch (error) {
      console.error(`❌ Failed to process job ${job.id}:`, error);

      // Log additional context for debugging
      console.error('Job details:', {
        jobId: job.id,
        orderId: webhookPayload.data.id,
        attempt: job.attemptsMade,
        maxAttempts: job.opts.attempts,
      });

      // Re-throw error to trigger BullMQ retry mechanism
      throw error;
    }
  }

  /**
   * Set up event handlers for monitoring and logging
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', job => {
      console.log(`✅ Job ${job.id} completed successfully`);

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
      }
    });

    this.worker.on('failed', (job, err) => {
      if (job) {
        console.error(`❌ Job ${job.id} failed:`, err.message);

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
          console.error(`💀 Job ${job.id} exhausted all retry attempts`);
          // Here you could send alerts, write to dead letter queue, etc.
        }
      }
    });

    this.worker.on('progress', (job, progress) => {
      console.log(`📊 Job ${job.id} progress: ${progress}%`);
    });

    this.worker.on('stalled', jobId => {
      console.warn(`⚠️ Job ${jobId} stalled`);
    });

    this.worker.on('error', err => {
      console.error('❌ Worker error:', err);
    });

    console.log('📋 OrderWorker event handlers configured');
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
        console.error('❌ Error updating queue metrics:', error);
      }
    }, 15000); // 15 seconds interval

    console.log('📊 Queue depth monitoring started (15s interval)');
  }

  /**
   * Graceful shutdown of the worker
   */
  async close(): Promise<void> {
    console.log('🛑 Shutting down OrderWorker...');

    await this.worker.close();
    await this.queue.close();
    await this.prismaClient.$disconnect();

    console.log('✅ OrderWorker shutdown complete');
  }
}

// Create and export the worker instance
const orderWorker = new OrderWorkerService();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down OrderWorker gracefully...');
  await orderWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down OrderWorker gracefully...');
  await orderWorker.close();
  process.exit(0);
});

export default orderWorker;
