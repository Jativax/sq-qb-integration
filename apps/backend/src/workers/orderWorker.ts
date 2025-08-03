import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { SquareApiClient } from '../services/squareClient';
import { QuickBooksClient } from '../services/quickBooksClient';
import { OrderProcessor } from '../services/orderProcessor';
import { SquareWebhookPayload } from '../schemas/webhookSchema';

class OrderWorkerService {
  private worker: Worker;
  private prismaClient: PrismaClient;

  constructor() {
    // Initialize Prisma client
    this.prismaClient = new PrismaClient();

    // Initialize BullMQ worker
    this.worker = new Worker(
      'order-processing',
      this.processOrderJob.bind(this),
      {
        connection: {
          host: process.env['REDIS_HOST'] || 'localhost',
          port: parseInt(process.env['REDIS_PORT'] || '6379'),
          ...(process.env['REDIS_PASSWORD'] && {
            password: process.env['REDIS_PASSWORD'],
          }),
          db: parseInt(process.env['REDIS_DB'] || '0'),
        },
        concurrency: parseInt(process.env['WORKER_CONCURRENCY'] || '5'), // Process up to 5 jobs concurrently
        limiter: {
          max: 10, // Maximum 10 jobs per duration
          duration: 60000, // 1 minute
        },
      }
    );

    this.setupEventHandlers();
    console.log('🔄 OrderWorker started and listening for jobs');
  }

  /**
   * Process an order job from the queue
   */
  private async processOrderJob(job: Job<SquareWebhookPayload>): Promise<void> {
    const { data: webhookPayload } = job;

    console.log(
      `🔄 Processing job ${job.id} for order ${webhookPayload.data.id}`
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

      // Create OrderProcessor with initialized clients
      const orderProcessor = new OrderProcessor(
        this.prismaClient,
        squareApiClient,
        quickBooksClient
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
    });

    this.worker.on('failed', (job, err) => {
      if (job) {
        console.error(`❌ Job ${job.id} failed:`, err.message);

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
   * Graceful shutdown of the worker
   */
  async close(): Promise<void> {
    console.log('🛑 Shutting down OrderWorker...');

    await this.worker.close();
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
