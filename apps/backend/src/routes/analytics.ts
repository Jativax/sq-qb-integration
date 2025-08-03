import express from 'express';
import { metricsService } from '../services/metricsService';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireViewer } from '../middleware/rbacMiddleware';
import logger from '../services/logger';

const router: express.Router = express.Router();

/**
 * Interface for structured analytics metrics response
 */
export interface AnalyticsMetrics {
  jobsProcessed: {
    completed: number;
    failed: number;
    active: number;
    waiting: number;
  };
  queueDepth: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  apiMetrics: {
    totalRequests: number;
    averageResponseTime: number;
    requestsP95: number;
  };
  externalApiMetrics: {
    square: {
      totalCalls: number;
      averageResponseTime: number;
      p95ResponseTime: number;
    };
    quickbooks: {
      totalCalls: number;
      averageResponseTime: number;
      p95ResponseTime: number;
    };
  };
  webhookMetrics: {
    totalReceived: number;
    accepted: number;
    rejected: number;
    failed: number;
  };
  orderMetrics: {
    totalProcessed: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  systemMetrics: {
    uptime: number;
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    cpuUsage: number;
  };
}

/**
 * GET /api/v1/analytics/metrics
 * Returns structured analytics metrics in JSON format for frontend consumption
 * Requires authentication and VIEWER role or higher
 */
router.get(
  '/',
  authMiddleware,
  requireViewer,
  async (req: express.Request, res: express.Response) => {
    try {
      logger.info({ userId: req.user?.id }, 'Fetching analytics metrics');

      // Get raw Prometheus metrics
      const rawMetrics = await metricsService.getMetrics();

      // Parse and structure the metrics
      const structuredMetrics = await parsePrometheusMetrics(rawMetrics);

      logger.info(
        {
          userId: req.user?.id,
          metricsCount: Object.keys(structuredMetrics).length,
        },
        'Analytics metrics retrieved successfully'
      );

      res.status(200).json({
        status: 'success',
        data: structuredMetrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        {
          err: error,
          userId: req.user?.id,
        },
        'Failed to retrieve analytics metrics'
      );

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve analytics metrics',
        code: 'ANALYTICS_METRICS_ERROR',
      });
    }
  }
);

/**
 * GET /api/v1/analytics/metrics/raw
 * Returns raw Prometheus metrics for advanced users
 * Requires authentication and VIEWER role or higher
 */
router.get(
  '/raw',
  authMiddleware,
  requireViewer,
  async (req: express.Request, res: express.Response) => {
    try {
      logger.info({ userId: req.user?.id }, 'Fetching raw Prometheus metrics');

      const rawMetrics = await metricsService.getMetrics();

      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.status(200).send(rawMetrics);
    } catch (error) {
      logger.error(
        {
          err: error,
          userId: req.user?.id,
        },
        'Failed to retrieve raw Prometheus metrics'
      );

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve raw metrics',
        code: 'RAW_METRICS_ERROR',
      });
    }
  }
);

/**
 * Parse Prometheus metrics text format into structured JSON
 * This is a custom implementation since no reliable parser library exists
 */
async function parsePrometheusMetrics(
  rawMetrics: string
): Promise<AnalyticsMetrics> {
  const lines = rawMetrics
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'));

  // Initialize metrics structure
  const metrics: AnalyticsMetrics = {
    jobsProcessed: { completed: 0, failed: 0, active: 0, waiting: 0 },
    queueDepth: { waiting: 0, active: 0, completed: 0, failed: 0 },
    apiMetrics: { totalRequests: 0, averageResponseTime: 0, requestsP95: 0 },
    externalApiMetrics: {
      square: { totalCalls: 0, averageResponseTime: 0, p95ResponseTime: 0 },
      quickbooks: { totalCalls: 0, averageResponseTime: 0, p95ResponseTime: 0 },
    },
    webhookMetrics: { totalReceived: 0, accepted: 0, rejected: 0, failed: 0 },
    orderMetrics: {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      successRate: 0,
    },
    systemMetrics: {
      uptime: 0,
      memoryUsage: { used: 0, total: 0, percentage: 0 },
      cpuUsage: 0,
    },
  };

  // Parse metrics line by line
  for (const line of lines) {
    try {
      const parts = line.split(' ');
      if (parts.length < 2) continue; // Skip malformed lines

      const [metricWithLabels, value] = parts;
      if (!metricWithLabels || !value) continue; // Skip if either part is missing

      const numericValue = parseFloat(value) || 0;

      // Parse BullMQ job metrics
      if (metricWithLabels.startsWith('bullmq_jobs_total')) {
        parseJobMetrics(metricWithLabels, numericValue, metrics);
      }

      // Parse queue depth metrics
      else if (metricWithLabels.startsWith('bullmq_queue_depth')) {
        parseQueueDepthMetrics(metricWithLabels, numericValue, metrics);
      }

      // Parse API request metrics
      else if (metricWithLabels.startsWith('api_request_duration_seconds')) {
        parseApiMetrics(metricWithLabels, numericValue, metrics);
      }

      // Parse external API metrics
      else if (metricWithLabels.startsWith('square_api_duration_seconds')) {
        parseSquareApiMetrics(metricWithLabels, numericValue, metrics);
      } else if (
        metricWithLabels.startsWith('quickbooks_api_duration_seconds')
      ) {
        parseQuickBooksApiMetrics(metricWithLabels, numericValue, metrics);
      }

      // Parse webhook metrics
      else if (metricWithLabels.startsWith('webhooks_received_total')) {
        parseWebhookMetrics(metricWithLabels, numericValue, metrics);
      }

      // Parse order metrics
      else if (metricWithLabels.startsWith('orders_processed_total')) {
        parseOrderMetrics(metricWithLabels, numericValue, metrics);
      }

      // Parse system metrics
      else if (metricWithLabels.startsWith('process_uptime_seconds')) {
        metrics.systemMetrics.uptime = numericValue;
      } else if (metricWithLabels.startsWith('nodejs_heap_size_used_bytes')) {
        metrics.systemMetrics.memoryUsage.used = numericValue;
      } else if (metricWithLabels.startsWith('nodejs_heap_size_total_bytes')) {
        metrics.systemMetrics.memoryUsage.total = numericValue;
      } else if (
        metricWithLabels.startsWith('process_cpu_user_seconds_total')
      ) {
        metrics.systemMetrics.cpuUsage = numericValue;
      }
    } catch (error) {
      // Skip malformed lines
      logger.debug({ line, error }, 'Skipped malformed metrics line');
    }
  }

  // Calculate derived metrics
  calculateDerivedMetrics(metrics);

  return metrics;
}

/**
 * Helper functions to parse specific metric types
 */
function parseJobMetrics(
  metricWithLabels: string,
  value: number,
  metrics: AnalyticsMetrics
): void {
  if (metricWithLabels.includes('status="completed"')) {
    metrics.jobsProcessed.completed += value;
  } else if (metricWithLabels.includes('status="failed"')) {
    metrics.jobsProcessed.failed += value;
  } else if (metricWithLabels.includes('status="active"')) {
    metrics.jobsProcessed.active += value;
  } else if (metricWithLabels.includes('status="waiting"')) {
    metrics.jobsProcessed.waiting += value;
  }
}

function parseQueueDepthMetrics(
  metricWithLabels: string,
  value: number,
  metrics: AnalyticsMetrics
): void {
  if (metricWithLabels.includes('status="waiting"')) {
    metrics.queueDepth.waiting = Math.max(metrics.queueDepth.waiting, value);
  } else if (metricWithLabels.includes('status="active"')) {
    metrics.queueDepth.active = Math.max(metrics.queueDepth.active, value);
  } else if (metricWithLabels.includes('status="completed"')) {
    metrics.queueDepth.completed = Math.max(
      metrics.queueDepth.completed,
      value
    );
  } else if (metricWithLabels.includes('status="failed"')) {
    metrics.queueDepth.failed = Math.max(metrics.queueDepth.failed, value);
  }
}

function parseApiMetrics(
  metricWithLabels: string,
  value: number,
  metrics: AnalyticsMetrics
): void {
  if (metricWithLabels.includes('_count')) {
    metrics.apiMetrics.totalRequests += value;
  } else if (metricWithLabels.includes('_sum')) {
    // This will be used to calculate average response time
  } else if (metricWithLabels.includes('le="0.95"')) {
    metrics.apiMetrics.requestsP95 = Math.max(
      metrics.apiMetrics.requestsP95,
      value
    );
  }
}

function parseSquareApiMetrics(
  metricWithLabels: string,
  value: number,
  metrics: AnalyticsMetrics
): void {
  if (metricWithLabels.includes('_count')) {
    metrics.externalApiMetrics.square.totalCalls += value;
  } else if (metricWithLabels.includes('le="0.95"')) {
    metrics.externalApiMetrics.square.p95ResponseTime = Math.max(
      metrics.externalApiMetrics.square.p95ResponseTime,
      value
    );
  }
}

function parseQuickBooksApiMetrics(
  metricWithLabels: string,
  value: number,
  metrics: AnalyticsMetrics
): void {
  if (metricWithLabels.includes('_count')) {
    metrics.externalApiMetrics.quickbooks.totalCalls += value;
  } else if (metricWithLabels.includes('le="0.95"')) {
    metrics.externalApiMetrics.quickbooks.p95ResponseTime = Math.max(
      metrics.externalApiMetrics.quickbooks.p95ResponseTime,
      value
    );
  }
}

function parseWebhookMetrics(
  metricWithLabels: string,
  value: number,
  metrics: AnalyticsMetrics
): void {
  metrics.webhookMetrics.totalReceived += value;

  if (metricWithLabels.includes('status="accepted"')) {
    metrics.webhookMetrics.accepted += value;
  } else if (metricWithLabels.includes('status="rejected"')) {
    metrics.webhookMetrics.rejected += value;
  } else if (metricWithLabels.includes('status="failed"')) {
    metrics.webhookMetrics.failed += value;
  }
}

function parseOrderMetrics(
  metricWithLabels: string,
  value: number,
  metrics: AnalyticsMetrics
): void {
  metrics.orderMetrics.totalProcessed += value;

  if (metricWithLabels.includes('status="success"')) {
    metrics.orderMetrics.successful += value;
  } else if (metricWithLabels.includes('status="failed"')) {
    metrics.orderMetrics.failed += value;
  }
}

/**
 * Calculate derived metrics from raw data
 */
function calculateDerivedMetrics(metrics: AnalyticsMetrics): void {
  // Calculate memory usage percentage
  if (metrics.systemMetrics.memoryUsage.total > 0) {
    metrics.systemMetrics.memoryUsage.percentage =
      (metrics.systemMetrics.memoryUsage.used /
        metrics.systemMetrics.memoryUsage.total) *
      100;
  }

  // Calculate order success rate
  if (metrics.orderMetrics.totalProcessed > 0) {
    metrics.orderMetrics.successRate =
      (metrics.orderMetrics.successful / metrics.orderMetrics.totalProcessed) *
      100;
  }

  // Convert memory from bytes to MB for readability
  metrics.systemMetrics.memoryUsage.used = Math.round(
    metrics.systemMetrics.memoryUsage.used / 1024 / 1024
  );
  metrics.systemMetrics.memoryUsage.total = Math.round(
    metrics.systemMetrics.memoryUsage.total / 1024 / 1024
  );

  // Round percentages to 2 decimal places
  metrics.systemMetrics.memoryUsage.percentage =
    Math.round(metrics.systemMetrics.memoryUsage.percentage * 100) / 100;
  metrics.orderMetrics.successRate =
    Math.round(metrics.orderMetrics.successRate * 100) / 100;
}

export default router;
