import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from './db';
import logger from './logger';

/**
 * Interface for audit event parameters
 */
export interface AuditEventParams {
  action: string;
  userId?: string;
  details?: Record<string, unknown>;
}

/**
 * Interface for audit log entry
 */
export interface AuditLogEntry {
  id: string;
  action: string;
  userId: string | null;
  details: Record<string, unknown>;
  timestamp: Date;
  createdAt: Date;
}

/**
 * AuditService provides comprehensive audit trail functionality
 * for logging all significant system and user actions
 */
export class AuditService {
  private readonly prismaClient: PrismaClient;

  constructor() {
    this.prismaClient = getPrismaClient();
  }

  /**
   * Log an audit event to the database
   * @param params - The audit event parameters
   * @returns Promise resolving to the created audit log entry
   */
  async logEvent(params: AuditEventParams): Promise<void> {
    try {
      const { action, userId, details } = params;

      logger.info(
        {
          action,
          userId,
          details,
        },
        'Creating audit log entry'
      );

      await this.prismaClient.auditLog.create({
        data: {
          action,
          userId: userId || null,
          details: (details || {}) as Record<string, unknown>,
        },
      });

      logger.info(
        {
          action,
          userId,
        },
        'Audit log entry created successfully'
      );
    } catch (error) {
      logger.error(
        {
          err: error,
          action: params.action,
          userId: params.userId,
        },
        'Failed to create audit log entry'
      );

      // Don't throw error to prevent audit logging from breaking the main flow
      // Just log the error and continue
    }
  }

  /**
   * Retrieve recent audit logs
   * @param limit - Maximum number of logs to retrieve (default: 100)
   * @returns Promise resolving to array of audit log entries
   */
  async getRecentLogs(limit: number = 100): Promise<AuditLogEntry[]> {
    try {
      logger.info({ limit }, 'Fetching recent audit logs');

      const logs = await this.prismaClient.auditLog.findMany({
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
      });

      logger.info({ count: logs.length }, 'Successfully fetched audit logs');
      return logs;
    } catch (error) {
      logger.error(
        {
          err: error,
          limit,
        },
        'Failed to fetch audit logs'
      );
      throw error;
    }
  }

  /**
   * Get audit logs for a specific action type
   * @param action - The action type to filter by
   * @param limit - Maximum number of logs to retrieve (default: 50)
   * @returns Promise resolving to array of audit log entries
   */
  async getLogsByAction(
    action: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    try {
      logger.info({ action, limit }, 'Fetching audit logs by action');

      const logs = await this.prismaClient.auditLog.findMany({
        where: {
          action,
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
      });

      logger.info(
        { action, count: logs.length },
        'Successfully fetched audit logs by action'
      );
      return logs;
    } catch (error) {
      logger.error(
        {
          err: error,
          action,
          limit,
        },
        'Failed to fetch audit logs by action'
      );
      throw error;
    }
  }

  /**
   * Get audit logs for a specific user
   * @param userId - The user ID to filter by
   * @param limit - Maximum number of logs to retrieve (default: 50)
   * @returns Promise resolving to array of audit log entries
   */
  async getLogsByUser(
    userId: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    try {
      logger.info({ userId, limit }, 'Fetching audit logs by user');

      const logs = await this.prismaClient.auditLog.findMany({
        where: {
          userId,
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
      });

      logger.info(
        { userId, count: logs.length },
        'Successfully fetched audit logs by user'
      );
      return logs;
    } catch (error) {
      logger.error(
        {
          err: error,
          userId,
          limit,
        },
        'Failed to fetch audit logs by user'
      );
      throw error;
    }
  }
}

// Export a singleton instance for easy use across the application
export const auditService = new AuditService();
export default auditService;
