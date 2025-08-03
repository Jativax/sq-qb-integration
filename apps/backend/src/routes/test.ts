import express from 'express';
import { PrismaClient } from '@prisma/client';
import { QueueService } from '../services/queueService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const router: any = express.Router();

// Only enable test routes in development/test environments
const isTestEnvironment =
  process.env['NODE_ENV'] === 'test' ||
  process.env['NODE_ENV'] === 'development';

if (!isTestEnvironment) {
  console.log('⚠️ Test routes disabled in production environment');
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
      console.log('🧹 Clearing test data...');

      const prisma = new PrismaClient();
      const queueService = new QueueService();

      // Clear database tables
      await prisma.quickBooksReceipt.deleteMany();
      await prisma.squareOrder.deleteMany();
      await prisma.syncJob.deleteMany();

      // Clear Redis queue
      const queue = queueService.getQueue();
      await queue.obliterate({ force: true });

      await prisma.$disconnect();

      console.log('✅ Test data cleared successfully');

      res.status(200).json({
        status: 'success',
        message: 'Test data cleared successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error clearing test data:', error);

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

      console.log('🔧 Forced failure mode enabled for next job');

      res.status(200).json({
        status: 'success',
        message: 'Forced failure mode enabled',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error enabling forced failure:', error);

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

      console.log('🔧 Forced failure mode disabled');

      res.status(200).json({
        status: 'success',
        message: 'Forced failure mode disabled',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error disabling forced failure:', error);

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to disable forced failure',
      });
    }
  }
);

export default router;
