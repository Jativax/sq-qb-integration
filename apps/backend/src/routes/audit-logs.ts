import express from 'express';
import auditService from '../services/auditService';
import logger from '../services/logger';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireViewer } from '../middleware/rbacMiddleware';

const router: express.Router = express.Router();

/**
 * GET /api/v1/audit-logs
 * Retrieves the 100 most recent audit logs, ordered by timestamp descending
 * Requires authentication and VIEWER role or higher
 */
router.get(
  '/',
  authMiddleware,
  requireViewer,
  async (req: express.Request, res: express.Response) => {
    try {
      logger.info('Fetching recent audit logs...');

      // Get query parameters for pagination/filtering
      const limit = parseInt(req.query['limit'] as string) || 100;
      const action = req.query['action'] as string;
      const userId = req.query['userId'] as string;

      let auditLogs;

      if (action) {
        // Filter by action if provided
        auditLogs = await auditService.getLogsByAction(action, limit);
        logger.info(
          { action, count: auditLogs.length },
          'Retrieved audit logs by action'
        );
      } else if (userId) {
        // Filter by user if provided
        auditLogs = await auditService.getLogsByUser(userId, limit);
        logger.info(
          { userId, count: auditLogs.length },
          'Retrieved audit logs by user'
        );
      } else {
        // Get recent logs without filtering
        auditLogs = await auditService.getRecentLogs(limit);
        logger.info({ count: auditLogs.length }, 'Retrieved recent audit logs');
      }

      res.status(200).json({
        status: 'success',
        data: auditLogs,
        count: auditLogs.length,
        filters: {
          limit,
          action: action || null,
          userId: userId || null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching audit logs');

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve audit logs',
        code: 'AUDIT_LOGS_ERROR',
      });
    }
  }
);

/**
 * GET /api/v1/audit-logs/actions
 * Retrieves distinct actions for filtering purposes
 * Requires authentication and VIEWER role or higher
 */
router.get(
  '/actions',
  authMiddleware,
  requireViewer,
  async (req: express.Request, res: express.Response) => {
    try {
      logger.info('Fetching distinct audit log actions...');

      // For now, return a hardcoded list of known actions
      // In the future, this could query the database for distinct actions
      const knownActions = [
        'ORDER_PROCESSED',
        'JOB_PERMANENTLY_FAILED',
        'JOB_RETRIED_BY_USER',
        'USER_LOGIN',
        'USER_LOGOUT',
        'CONFIGURATION_CHANGED',
        'SYSTEM_STARTED',
        'SYSTEM_SHUTDOWN',
      ];

      logger.info(
        { count: knownActions.length },
        'Retrieved distinct audit log actions'
      );

      res.status(200).json({
        status: 'success',
        data: knownActions,
        count: knownActions.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching audit log actions');

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve audit log actions',
        code: 'AUDIT_ACTIONS_ERROR',
      });
    }
  }
);

/**
 * GET /api/v1/audit-logs/stats
 * Retrieves audit log statistics
 * Requires authentication and VIEWER role or higher
 */
router.get(
  '/stats',
  authMiddleware,
  requireViewer,
  async (req: express.Request, res: express.Response) => {
    try {
      logger.info('Fetching audit log statistics...');

      // Get recent logs to calculate stats
      const recentLogs = await auditService.getRecentLogs(1000);

      // Calculate statistics
      const actionCounts: Record<string, number> = {};
      const userCounts: Record<string, number> = {};
      let totalLogs = recentLogs.length;

      recentLogs.forEach(log => {
        // Count by action
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;

        // Count by user (if userId exists)
        if (log.userId) {
          userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
        }
      });

      // Calculate most common action and most active user safely
      const actionKeys = Object.keys(actionCounts);
      const userKeys = Object.keys(userCounts);

      const mostCommonAction =
        actionKeys.length > 0
          ? actionKeys.reduce((a, b) =>
              (actionCounts[a] || 0) > (actionCounts[b] || 0) ? a : b
            )
          : '';

      const mostActiveUser =
        userKeys.length > 0
          ? userKeys.reduce((a, b) =>
              (userCounts[a] || 0) > (userCounts[b] || 0) ? a : b
            )
          : '';

      const stats = {
        totalLogs,
        actionCounts,
        userCounts,
        mostCommonAction,
        mostActiveUser,
      };

      logger.info({ totalLogs }, 'Retrieved audit log statistics');

      res.status(200).json({
        status: 'success',
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching audit log statistics');

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve audit log statistics',
        code: 'AUDIT_STATS_ERROR',
      });
    }
  }
);

export default router;
