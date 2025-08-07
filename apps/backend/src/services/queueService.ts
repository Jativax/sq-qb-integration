import { Queue } from 'bullmq';
import { SquareWebhookPayload } from '../schemas/webhookSchema';
import logger from './logger';
import config from '../config';

export class QueueService {
  private queue: Queue;
  private systemQueue: Queue;
  private deadLetterQueue: Queue;

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
        maxRetriesPerRequest: 3, // Add automatic retries for Redis connection
        enableReadyCheck: true,
        retryDelayOnFailover: 100,
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 5000,
      },
      defaultJobOptions: {
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 5, // Retry failed jobs up to 5 times
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
        maxRetriesPerRequest: 3, // Add automatic retries for Redis connection
        enableReadyCheck: true,
        retryDelayOnFailover: 100,
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 5000,
      },
    });

    logger.info('System jobs queue initialized');

    // Initialize dead letter queue for permanently failed jobs
    this.deadLetterQueue = new Queue('dead-letter-queue', {
      connection: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        ...(config.REDIS_PASSWORD && {
          password: config.REDIS_PASSWORD,
        }),
        db: config.REDIS_DB,
        maxRetriesPerRequest: 3, // Add automatic retries for Redis connection
        enableReadyCheck: true,
        retryDelayOnFailover: 100,
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 5000,
      },
      defaultJobOptions: {
        removeOnComplete: 100, // Keep more completed DLQ jobs for analysis
        removeOnFail: 100,
        attempts: 1, // No retries in DLQ
      },
    });

    logger.info('Dead letter queue initialized');
  }

  /**
   * Get retry configuration based on error type
   */
  private getRetryConfig(errorType?: 'client' | 'server' | 'network') {
    switch (errorType) {
      case 'client':
        // 4xx errors - likely won't succeed on retry, fewer attempts
        return {
          attempts: 2,
          backoff: {
            type: 'fixed' as const,
            delay: 5000, // 5 seconds
          },
        };
      case 'network':
        // Network errors - more aggressive retries
        return {
          attempts: 8,
          backoff: {
            type: 'exponential' as const,
            delay: 1000, // Start with 1 second
          },
        };
      case 'server':
      default:
        // 5xx errors or unknown - standard retry policy
        return {
          attempts: 5,
          backoff: {
            type: 'exponential' as const,
            delay: 2000, // Start with 2 seconds
          },
        };
    }
  }

  /**
   * Add a new order processing job to the queue
   */
  async addOrderJob(
    payload: SquareWebhookPayload,
    options?: {
      priority?: number;
      delay?: number;
      errorType?: 'client' | 'server' | 'network';
    }
  ): Promise<string> {
    const jobId = `order-${payload.data.id}-${Date.now()}`;
    const retryConfig = this.getRetryConfig(options?.errorType);

    const job = await this.queue.add('process-order', payload, {
      jobId,
      priority: options?.priority ?? 1, // Higher priority for order processing
      delay: options?.delay ?? 0, // Process immediately
      ...retryConfig,
    });

    logger.info(
      {
        jobId: job.id,
        orderId: payload.data.id,
        attempts: retryConfig.attempts,
        errorType: options?.errorType,
      },
      'Order job queued with retry policy'
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
            pattern: cronExpression,
            tz: 'UTC',
          },
        }
      );
      logger.info(
        { cronExpression },
        'Scheduled financial reconciliation cron job'
      );
    } catch (error) {
      logger.error(
        { err: error },
        'Failed to schedule reconciliation cron job'
      );
    }
  }

  /**
   * Move a permanently failed job to the dead letter queue
   */
  async moveToDeadLetterQueue(
    failedJob: {
      id: string;
      queueName: string;
      data: unknown;
      attemptsMade: number;
      failedReason?: string;
    },
    reason: string
  ): Promise<string> {
    const dlqJobId = `dlq-${failedJob.id}-${Date.now()}`;

    const dlqJob = await this.deadLetterQueue.add(
      'dead-letter',
      {
        originalJobId: failedJob.id,
        originalQueue: failedJob.queueName,
        originalData: failedJob.data,
        failureReason: reason,
        originalAttempts: failedJob.attemptsMade,
        failedAt: new Date().toISOString(),
        lastError: failedJob.failedReason,
      },
      {
        jobId: dlqJobId,
      }
    );

    logger.error(
      {
        dlqJobId: dlqJob.id,
        originalJobId: failedJob.id,
        reason,
        attempts: failedJob.attemptsMade,
      },
      'Job moved to dead letter queue'
    );

    return dlqJob.id as string;
  }

  /**
   * Get dead letter queue statistics
   */
  async getDeadLetterStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.deadLetterQueue.getWaiting(),
      this.deadLetterQueue.getActive(),
      this.deadLetterQueue.getCompleted(),
      this.deadLetterQueue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  /**
   * Retry a job from the dead letter queue
   * Useful for manual intervention after fixing underlying issues
   */
  async retryFromDeadLetterQueue(dlqJobId: string): Promise<string | null> {
    try {
      const dlqJob = await this.deadLetterQueue.getJob(dlqJobId);
      if (!dlqJob) {
        logger.warn({ dlqJobId }, 'Dead letter queue job not found');
        return null;
      }

      const originalData = dlqJob.data.originalData;

      // Re-queue with standard retry policy
      const newJobId = await this.addOrderJob(originalData);

      // Mark DLQ job as completed
      await dlqJob.moveToCompleted(
        {
          retriedAt: new Date().toISOString(),
          newJobId,
        },
        dlqJob.token || ''
      );

      logger.info({ dlqJobId, newJobId }, 'Job retried from dead letter queue');

      return newJobId;
    } catch (error) {
      logger.error(
        { err: error, dlqJobId },
        'Error retrying job from dead letter queue'
      );
      throw error;
    }
  }

  /**
   * Graceful shutdown of the queue
   */
  async close(): Promise<void> {
    await Promise.all([
      this.queue.close(),
      this.systemQueue.close(),
      this.deadLetterQueue.close(),
    ]);
    logger.info('QueueService closed');
  }
}
