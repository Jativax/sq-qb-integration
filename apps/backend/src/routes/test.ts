import express from 'express';
import { QueueService } from '../services/queueService';
import logger from '../services/logger';
import { getPrismaClient } from '../services/db';
import config from '../config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const router: any = express.Router();

// Only enable test routes in development/test environments
const isTestEnvironment =
  config.NODE_ENV === 'test' || config.NODE_ENV === 'development';

if (!isTestEnvironment) {
  logger.warn('Test routes disabled in production environment');
}

/**
 * POST /clear
 * Clears all test data from Redis queue and database
 * Only available in development/test environments
 */
router.post(
  '/clear',
  async (req: express.Request, res: express.Response): Promise<void> => {
    if (!isTestEnvironment) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Test endpoints not available in production',
      });
      return;
    }

    try {
      logger.info('Clearing test data...');

      const prisma = getPrismaClient();
      const queueService = new QueueService();

      // Clear database tables
      await prisma.quickBooksReceipt.deleteMany();
      await prisma.squareOrder.deleteMany();
      await prisma.syncJob.deleteMany();

      // Clear Redis queue
      const queue = queueService.getQueue();
      await queue.obliterate({ force: true });

      // Note: We don't disconnect the singleton here as it may be used elsewhere

      logger.info('Test data cleared successfully');

      res.status(200).json({
        status: 'success',
        message: 'Test data cleared successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error clearing test data');

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to clear test data',
        code: 'CLEAR_TEST_DATA_ERROR',
      });
    }
  }
);

/**
 * POST /force-failure
 * Forces the next job processing to fail for testing purposes
 * Only available in development/test environments
 */
router.post(
  '/force-failure',
  async (req: express.Request, res: express.Response): Promise<void> => {
    if (!isTestEnvironment) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Test endpoints not available in production',
      });
      return;
    }

    try {
      // Set environment variable to force failure
      process.env['FORCE_QB_FAILURE'] = 'true';

      logger.info('Forced failure mode enabled for next job');

      res.status(200).json({
        status: 'success',
        message: 'Forced failure mode enabled',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error enabling forced failure');

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to enable forced failure',
      });
    }
  }
);

/**
 * POST /disable-failure
 * Disables forced failure mode
 * Only available in development/test environments
 */
router.post(
  '/disable-failure',
  async (req: express.Request, res: express.Response): Promise<void> => {
    if (!isTestEnvironment) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Test endpoints not available in production',
      });
      return;
    }

    try {
      // Remove environment variable
      delete process.env['FORCE_QB_FAILURE'];

      logger.info('Forced failure mode disabled');

      res.status(200).json({
        status: 'success',
        message: 'Forced failure mode disabled',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error disabling forced failure');

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to disable forced failure',
      });
    }
  }
);

export default router;
