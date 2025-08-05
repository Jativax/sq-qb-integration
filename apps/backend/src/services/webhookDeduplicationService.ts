import { getPrismaClient } from './db';
import logger from './logger';

/**
 * Service for handling webhook deduplication using event_id
 * Prevents processing duplicate webhook events from Square
 */
export class WebhookDeduplicationService {
  private prisma = getPrismaClient();

  /**
   * Check if a webhook event has already been processed
   * @param eventId - Square webhook event_id
   * @returns true if already processed, false if new
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    try {
      const existing = await this.prisma.webhookDeduplication.findUnique({
        where: { eventId },
        select: { processed: true },
      });

      return existing?.processed === true;
    } catch (error) {
      logger.error(
        { err: error, eventId },
        'Error checking webhook deduplication'
      );
      // In case of database error, allow processing to prevent blocking
      return false;
    }
  }

  /**
   * Mark an event as received (but not yet processed)
   * This creates a record to prevent duplicate processing
   * @param eventId - Square webhook event_id
   * @param eventType - Type of webhook event
   * @returns true if successfully marked, false if already exists
   */
  async markEventReceived(
    eventId: string,
    eventType: string
  ): Promise<boolean> {
    try {
      // Set expiration to 7 days from now for cleanup
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.prisma.webhookDeduplication.create({
        data: {
          eventId,
          eventType,
          processed: false,
          expiresAt,
        },
      });

      logger.debug({ eventId, eventType }, 'Webhook event marked as received');
      return true;
    } catch (error) {
      // If this fails due to unique constraint, the event was already received
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        logger.warn(
          { eventId, eventType },
          'Webhook event already received (duplicate)'
        );
        return false;
      }

      logger.error(
        { err: error, eventId, eventType },
        'Error marking webhook as received'
      );
      throw error;
    }
  }

  /**
   * Mark an event as fully processed
   * @param eventId - Square webhook event_id
   */
  async markEventProcessed(eventId: string): Promise<void> {
    try {
      await this.prisma.webhookDeduplication.update({
        where: { eventId },
        data: { processed: true },
      });

      logger.debug({ eventId }, 'Webhook event marked as processed');
    } catch (error) {
      logger.error(
        { err: error, eventId },
        'Error marking webhook as processed'
      );
      throw error;
    }
  }

  /**
   * Handle a webhook with full deduplication flow
   * @param eventId - Square webhook event_id
   * @param eventType - Type of webhook event
   * @param processFunction - Function to execute if not duplicate
   * @returns processing result or null if duplicate
   */
  async handleWithDeduplication<T>(
    eventId: string,
    eventType: string,
    processFunction: () => Promise<T>
  ): Promise<T | null> {
    // Check if already processed
    if (await this.isEventProcessed(eventId)) {
      logger.info(
        { eventId, eventType },
        'Webhook event already processed, skipping'
      );
      return null;
    }

    // Mark as received to prevent concurrent processing
    const wasMarked = await this.markEventReceived(eventId, eventType);
    if (!wasMarked) {
      logger.info(
        { eventId, eventType },
        'Webhook event already being processed by another instance'
      );
      return null;
    }

    try {
      // Process the webhook
      const result = await processFunction();

      // Mark as processed
      await this.markEventProcessed(eventId);

      logger.info(
        { eventId, eventType },
        'Webhook event processed successfully'
      );

      return result;
    } catch (error) {
      logger.error(
        { err: error, eventId, eventType },
        'Error processing webhook event'
      );
      throw error;
    }
  }

  /**
   * Clean up expired deduplication records
   * Should be called periodically (e.g., daily cron job)
   */
  async cleanupExpiredRecords(): Promise<number> {
    try {
      const result = await this.prisma.webhookDeduplication.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      logger.info(
        { deletedCount: result.count },
        'Cleaned up expired webhook deduplication records'
      );

      return result.count;
    } catch (error) {
      logger.error(
        { err: error },
        'Error cleaning up expired webhook deduplication records'
      );
      throw error;
    }
  }

  /**
   * Get statistics about webhook deduplication
   */
  async getStats(): Promise<{
    totalRecords: number;
    processedRecords: number;
    pendingRecords: number;
    expiredRecords: number;
  }> {
    try {
      const [totalRecords, processedRecords, expiredRecords] =
        await Promise.all([
          this.prisma.webhookDeduplication.count(),
          this.prisma.webhookDeduplication.count({
            where: { processed: true },
          }),
          this.prisma.webhookDeduplication.count({
            where: {
              expiresAt: {
                lt: new Date(),
              },
            },
          }),
        ]);

      const pendingRecords = totalRecords - processedRecords;

      return {
        totalRecords,
        processedRecords,
        pendingRecords,
        expiredRecords,
      };
    } catch (error) {
      logger.error({ err: error }, 'Error getting webhook deduplication stats');
      throw error;
    }
  }
}

// Export singleton instance
export const webhookDeduplicationService = new WebhookDeduplicationService();
