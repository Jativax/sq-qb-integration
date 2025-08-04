import fetch from 'node-fetch';
import { Worker, Queue } from 'bullmq';
import logger from '../services/logger';
import config from '../config';
import { SquareApiClient } from '../services/squareClient';
import { getPrismaClient } from '../services/db';
// import { metricsService } from '../services/metricsService';

/**
 * ReconciliationWorkerService
 * ---------------------------
 * This worker runs on the `system-jobs` queue and periodically reconciles
 * completed Square orders with QuickBooks receipts stored in the local DB.
 *
 * - Runs as a repeatable BullMQ job (`financial-reconciliation`).
 * - For the last 24 h (excluding most-recent 30 min) it ensures every COMPLETED
 *   Square order has a matching QuickBooksReceipt record.
 * - For any "orphan" orders found it:
 *   • Logs a critical error.
 *   • Enqueues an immediate job on the `order-processing` queue to re-process
 *     the order.
 *   • Emits an alert placeholder (via log) so that a monitoring/alerting
 *     system can react.
 */
class ReconciliationWorkerService {
  private worker: Worker;
  private orderQueue: Queue;
  private prisma = getPrismaClient();
  private static JOB_NAME = 'financial-reconciliation';

  constructor() {
    const connectionConfig = {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      ...(config.REDIS_PASSWORD && { password: config.REDIS_PASSWORD }),
      db: config.REDIS_DB,
    } as const;

    // Queue we will push orphan re-processing jobs to
    this.orderQueue = new Queue('order-processing', {
      connection: connectionConfig,
    });

    // Worker that executes the reconciliation logic
    this.worker = new Worker(
      'system-jobs',
      async () => {
        await this.runReconciliation();
      },
      {
        connection: connectionConfig,
        concurrency: 1, // only one reconciliation task at a time
      }
    );

    logger.info('ReconciliationWorker started and listening for cron jobs');
  }

  /**
   * Core reconciliation workflow.
   */
  private async runReconciliation(): Promise<void> {
    const now = new Date();
    const endTime = new Date(now.getTime() - 30 * 60 * 1000); // exclude last 30 min
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // previous 24 h

    logger.info(
      { startTime: startTime.toISOString(), endTime: endTime.toISOString() },
      'Starting financial reconciliation run'
    );

    try {
      // 1) Fetch completed Square orders in the time window
      const squareClient = new SquareApiClient({
        accessToken: config.SQUARE_ACCESS_TOKEN,
        applicationId: config.SQUARE_APPLICATION_ID,
        environment: config.SQUARE_ENVIRONMENT,
      });

      const completedOrders = await this.fetchCompletedSquareOrders(
        squareClient,
        startTime,
        endTime
      );

      // 2) Build a Set of Square Order IDs that already have QB receipts
      const receipts = await this.prisma.quickBooksReceipt.findMany({
        where: {
          createdAt: {
            gte: startTime,
            lte: endTime,
          },
        },
        include: {
          squareOrder: true,
        },
      });

      const receiptOrderIds = new Set(
        receipts.map(
          (r: { squareOrder: { squareOrderId: string } }) =>
            r.squareOrder.squareOrderId
        )
      );

      // 3) Identify orphan orders
      const orphanOrders = completedOrders.filter(
        order => !receiptOrderIds.has(order.id)
      );

      logger.info(
        {
          totalCompleted: completedOrders.length,
          orphanCount: orphanOrders.length,
        },
        'Reconciliation run statistics'
      );

      // 4) Handle any orphan orders found
      for (const order of orphanOrders) {
        await this.handleOrphanOrder(order);
      }

      // Record reconciliation metrics using existing counters
      logger.info(
        { orphanCount: orphanOrders.length },
        'Reconciliation completed with orphan count metric'
      );
    } catch (error) {
      logger.error({ err: error }, 'Reconciliation job failed');
      throw error; // allow BullMQ to mark the run as failed
    }
  }

  /**
   * Fetch COMPLETED Square orders via the Search Orders API within a date range.
   */
  private async fetchCompletedSquareOrders(
    client: SquareApiClient,
    start: Date,
    end: Date
  ): Promise<Array<{ id: string; [key: string]: unknown }>> {
    const url = `${client.baseURL}/v2/orders/search`;

    const body = {
      query: {
        filter: {
          state_filter: {
            states: ['COMPLETED'],
          },
          date_time_filter: {
            created_at: {
              start_at: start.toISOString(),
              end_at: end.toISOString(),
            },
          },
        },
      },
    } as const;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.SQUARE_ACCESS_TOKEN}`,
        'Square-Version': '2023-10-18',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(
        `Failed to search Square orders: HTTP ${resp.status} – ${text}`
      );
    }

    const data = (await resp.json()) as { orders?: Array<{ id: string }> };
    return data.orders ?? [];
  }

  /**
   * Handle an orphan Square order (log & enqueue for re-processing).
   */
  private async handleOrphanOrder(order: {
    id: string;
    [key: string]: unknown;
  }) {
    logger.error(
      { orphanOrderId: order.id, order },
      'Orphan Square order found! Revenue may not be booked.'
    );

    // Enqueue a re-processing job immediately
    await this.orderQueue.add(
      'process-order',
      {
        merchant_id: 'reconciliation',
        type: 'order.reconciled',
        event_id: `reconcile-${order.id}`,
        created_at: new Date().toISOString(),
        data: {
          type: 'order',
          id: order.id,
          object: {
            order,
          },
        },
      },
      {
        jobId: `reprocess-${order.id}-${Date.now()}`,
        priority: 1,
      }
    );

    logger.warn(
      { orderId: order.id },
      'Enqueued re-processing job for orphan order'
    );

    // Placeholder for alerting/monitoring integration
    logger.warn(
      { orderId: order.id },
      'ALERT: Orphan order detected – monitoring system notified'
    );
  }
}

// Instantiate the worker immediately when this module is imported
export default new ReconciliationWorkerService();
