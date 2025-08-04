import { Queue } from 'bullmq';
import { SquareWebhookPayload } from '../schemas/webhookSchema';
import logger from './logger';
import config from '../config';

export class QueueService {
  private queue: Queue;
  private systemQueue: Queue;

  constructor() {
    // Initialize BullMQ queue with Redis connection
    this.queue = new Queue('order-processing', {
      connection: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        ...(config.REDIS_PASSWORD && {
          password: config.REDIS_PASSWORD,
        }),
        db: config.REDIS_DB,
      },
      defaultJobOptions: {
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay, exponentially increase
        },
      },
    });

    logger.info('QueueService initialized with Redis connection');

    // Initialize separate system-jobs queue for scheduled/maintenance tasks
    this.systemQueue = new Queue('system-jobs', {
      connection: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        ...(config.REDIS_PASSWORD && {
          password: config.REDIS_PASSWORD,
        }),
        db: config.REDIS_DB,
      },
    });
    logger.info('System jobs queue initialized');
  }

  /**
   * Add a new order processing job to the queue
   */
  async addOrderJob(payload: SquareWebhookPayload): Promise<string> {
    const jobId = `order-${payload.data.id}-${Date.now()}`;

    const job = await this.queue.add('process-order', payload, {
      jobId,
      priority: 1, // Higher priority for order processing
      delay: 0, // Process immediately
    });

    logger.info(
      { jobId: job.id, orderId: payload.data.id },
      'Order job queued'
    );
    return job.id as string;
  }

  /**
   * Get queue statistics for monitoring
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  /**
   * Get all failed jobs from the queue
   */
  async getFailedJobs(): Promise<
    Array<{
      id: string;
      data: SquareWebhookPayload;
      failedReason: string;
      attemptsMade: number;
      timestamp: Date;
    }>
  > {
    const failedJobs = await this.queue.getFailed();

    return failedJobs.map(job => ({
      id: job.id as string,
      data: job.data as SquareWebhookPayload,
      failedReason: job.failedReason || 'Unknown error',
      attemptsMade: job.attemptsMade,
      timestamp: new Date(job.timestamp),
    }));
  }

  /**
   * Retry a specific failed job by its ID
   */
  async retryJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.queue.getJob(jobId);

      if (!job) {
        logger.error({ jobId }, 'Job not found');
        return false;
      }

      if (job.finishedOn && !job.failedReason) {
        logger.error({ jobId }, 'Job is not in failed state');
        return false;
      }

      // Retry the job
      await job.retry();
      logger.info({ jobId }, 'Job retried successfully');
      return true;
    } catch (error) {
      logger.error({ err: error, jobId }, 'Failed to retry job');
      return false;
    }
  }

  /**
   * Get the underlying queue instance for advanced operations
   */
  getQueue() {
    return this.queue;
  }

  /**
   * Schedule the repeatable financial reconciliation job (default: hourly)
   */
  async scheduleReconciliationJob(cronExpression: string = '0 * * * *') {
    try {
      await this.systemQueue.add(
        'financial-reconciliation',
        {},
        {
          jobId: 'financial-reconciliation-cron',
          repeat: {
            cron: cronExpression,
            tz: 'UTC',
          },
        }
      );
      logger.info({ cronExpression }, 'Scheduled financial reconciliation cron job');
    } catch (error) {
      logger.error({ err: error }, 'Failed to schedule reconciliation cron job');
    }
  }

  /**
   * Graceful shutdown of the queue
   */
  async close(): Promise<void> {
    await this.queue.close();
    logger.info('QueueService closed');
  }
}
