import { Queue } from 'bullmq';
import { SquareWebhookPayload } from '../schemas/webhookSchema';

export class QueueService {
  private queue: Queue;

  constructor() {
    // Initialize BullMQ queue with Redis connection
    this.queue = new Queue('order-processing', {
      connection: {
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379'),
        ...(process.env['REDIS_PASSWORD'] && {
          password: process.env['REDIS_PASSWORD'],
        }),
        db: parseInt(process.env['REDIS_DB'] || '0'),
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

    console.log('📦 QueueService initialized with Redis connection');
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

    console.log(`✅ Order job queued: ${job.id} for order ${payload.data.id}`);
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
        console.error(`❌ Job ${jobId} not found`);
        return false;
      }

      if (job.finishedOn && !job.failedReason) {
        console.error(`❌ Job ${jobId} is not in failed state`);
        return false;
      }

      // Retry the job
      await job.retry();
      console.log(`🔄 Job ${jobId} retried successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to retry job ${jobId}:`, error);
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
   * Graceful shutdown of the queue
   */
  async close(): Promise<void> {
    await this.queue.close();
    console.log('📦 QueueService closed');
  }
}
