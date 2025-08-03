import express from 'express';
import { QueueService } from '../services/queueService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const router: any = express.Router();

/**
 * GET /failed
 * Retrieves all failed jobs from the order-processing queue
 */
router.get('/failed', async (req: express.Request, res: express.Response) => {
  try {
    console.log('📋 Fetching failed jobs...');

    const queueService = new QueueService();
    const failedJobs = await queueService.getFailedJobs();

    console.log(`✅ Retrieved ${failedJobs.length} failed jobs`);

    res.status(200).json({
      status: 'success',
      data: failedJobs,
      count: failedJobs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching failed jobs:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve failed jobs',
      code: 'FAILED_JOBS_ERROR',
    });
  }
});

/**
 * POST /:jobId/retry
 * Retries a specific failed job by its ID
 */
router.post(
  '/:jobId/retry',
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const jobId = req.params['jobId'];

      if (!jobId) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Job ID is required',
          code: 'MISSING_JOB_ID',
        });
        return;
      }

      console.log(`🔄 Attempting to retry job: ${jobId}`);

      const queueService = new QueueService();
      const retryResult = await queueService.retryJob(jobId);

      if (retryResult) {
        console.log(`✅ Successfully retried job: ${jobId}`);

        res.status(200).json({
          status: 'success',
          message: 'Job retried successfully',
          jobId,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.error(`❌ Failed to retry job: ${jobId}`);

        res.status(404).json({
          error: 'Not Found',
          message: 'Job not found or not in failed state',
          code: 'JOB_NOT_FOUND',
          jobId,
        });
      }
    } catch (error) {
      console.error('❌ Error retrying job:', error);

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retry job',
        code: 'RETRY_JOB_ERROR',
      });
    }
  }
);

export default router;
