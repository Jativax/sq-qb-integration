import express from 'express';
import { QueueService } from '../services/queueService';
import logger from '../services/logger';
import auditService from '../services/auditService';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/rbacMiddleware';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const router: any = express.Router();

/**
 * GET /failed
 * Retrieves all failed jobs from the order-processing queue
 * Requires authentication
 */
router.get(
  '/failed',
  authMiddleware,
  async (req: express.Request, res: express.Response) => {
    try {
      logger.info('Fetching failed jobs...');

      const queueService = new QueueService();
      const failedJobs = await queueService.getFailedJobs();

      logger.info({ count: failedJobs.length }, 'Retrieved failed jobs');

      res.status(200).json({
        status: 'success',
        data: failedJobs,
        count: failedJobs.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching failed jobs');

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve failed jobs',
        code: 'FAILED_JOBS_ERROR',
      });
    }
  }
);

/**
 * POST /:jobId/retry
 * Retries a specific failed job by its ID
 * Requires authentication and ADMIN role
 */
router.post(
  '/:jobId/retry',
  authMiddleware,
  requireAdmin,
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

      logger.info({ jobId }, 'Attempting to retry job');

      const queueService = new QueueService();
      const retryResult = await queueService.retryJob(jobId);

      if (retryResult) {
        logger.info({ jobId }, 'Successfully retried job');

        // Log audit event for job retry with actual user ID
        auditService.logEvent({
          action: 'JOB_RETRIED_BY_USER',
          userId: req.user!.id,
          details: {
            jobId,
            userEmail: req.user!.email,
            userRole: req.user!.role,
            timestamp: new Date().toISOString(),
          },
        });

        res.status(200).json({
          status: 'success',
          message: 'Job retried successfully',
          jobId,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.error({ jobId }, 'Failed to retry job');

        res.status(404).json({
          error: 'Not Found',
          message: 'Job not found or not in failed state',
          code: 'JOB_NOT_FOUND',
          jobId,
        });
      }
    } catch (error) {
      logger.error({ err: error }, 'Error retrying job');

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retry job',
        code: 'RETRY_JOB_ERROR',
      });
    }
  }
);

export default router;
