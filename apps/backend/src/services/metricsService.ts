import {
  Histogram,
  Counter,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import logger from './logger';

/**
 * Comprehensive Metrics Service for Square-QuickBooks Integration
 * Provides Prometheus metrics for monitoring application performance,
 * job processing, external API interactions, and queue health.
 */
export class MetricsService {
  // Main Prometheus registry
  public readonly registry: Registry;

  // API Request Metrics
  public readonly apiRequestDuration: Histogram<string>;

  // BullMQ Job Metrics
  public readonly bullmqJobsTotal: Counter<string>;
  public readonly bullmqJobDuration: Histogram<string>;
  public readonly bullmqQueueDepth: Gauge<string>;

  // External API Metrics
  public readonly squareApiDuration: Histogram<string>;
  public readonly quickbooksApiDuration: Histogram<string>;

  // Database Operation Metrics
  public readonly databaseQueryDuration: Histogram<string>;
  public readonly databaseConnectionsActive: Gauge<string>;

  // Custom Business Metrics
  public readonly webhooksReceived: Counter<string>;
  public readonly ordersProcessed: Counter<string>;
  public readonly mappingStrategiesUsed: Counter<string>;

  constructor() {
    // Initialize registry
    this.registry = new Registry();

    // Collect default Node.js metrics (CPU, memory, event loop lag, etc.)
    collectDefaultMetrics({ register: this.registry });

    // API Request Duration Histogram
    this.apiRequestDuration = new Histogram({
      name: 'api_request_duration_seconds',
      help: 'Duration of HTTP API requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'user_agent'] as const,
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10], // Reasonable API response time buckets
      registers: [this.registry],
    });

    // BullMQ Job Total Counter
    this.bullmqJobsTotal = new Counter({
      name: 'bullmq_jobs_total',
      help: 'Total number of BullMQ jobs processed by status',
      labelNames: ['queue_name', 'job_name', 'status'] as const,
      registers: [this.registry],
    });

    // BullMQ Job Duration Histogram
    this.bullmqJobDuration = new Histogram({
      name: 'bullmq_job_duration_seconds',
      help: 'Duration of BullMQ job processing in seconds',
      labelNames: ['queue_name', 'job_name', 'status'] as const,
      buckets: [1, 5, 10, 30, 60, 120, 300, 600], // Job processing time buckets
      registers: [this.registry],
    });

    // BullMQ Queue Depth Gauge
    this.bullmqQueueDepth = new Gauge({
      name: 'bullmq_queue_depth',
      help: 'Number of jobs waiting in BullMQ queues',
      labelNames: ['queue_name', 'status'] as const,
      registers: [this.registry],
    });

    // Square API Duration Histogram
    this.squareApiDuration = new Histogram({
      name: 'square_api_duration_seconds',
      help: 'Duration of Square API calls in seconds',
      labelNames: ['endpoint', 'method', 'status_code'] as const,
      buckets: [0.5, 1, 2, 5, 10, 15, 30], // External API response time buckets
      registers: [this.registry],
    });

    // QuickBooks API Duration Histogram
    this.quickbooksApiDuration = new Histogram({
      name: 'quickbooks_api_duration_seconds',
      help: 'Duration of QuickBooks API calls in seconds',
      labelNames: ['endpoint', 'method', 'status_code'] as const,
      buckets: [0.5, 1, 2, 5, 10, 15, 30], // External API response time buckets
      registers: [this.registry],
    });

    // Database Query Duration Histogram
    this.databaseQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table', 'status'] as const,
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5], // Database query time buckets
      registers: [this.registry],
    });

    // Database Connections Active Gauge
    this.databaseConnectionsActive = new Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections',
      labelNames: ['pool'] as const,
      registers: [this.registry],
    });

    // Webhooks Received Counter
    this.webhooksReceived = new Counter({
      name: 'webhooks_received_total',
      help: 'Total number of webhooks received',
      labelNames: ['source', 'event_type', 'status'] as const,
      registers: [this.registry],
    });

    // Orders Processed Counter
    this.ordersProcessed = new Counter({
      name: 'orders_processed_total',
      help: 'Total number of orders processed through the integration',
      labelNames: ['status', 'strategy'] as const,
      registers: [this.registry],
    });

    // Mapping Strategies Used Counter
    this.mappingStrategiesUsed = new Counter({
      name: 'mapping_strategies_used_total',
      help: 'Total number of times each mapping strategy was used',
      labelNames: ['strategy_name', 'success'] as const,
      registers: [this.registry],
    });

    logger.info('MetricsService initialized with comprehensive monitoring');
  }

  /**
   * Get all metrics in Prometheus text format
   */
  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  /**
   * Record API request duration and metadata
   */
  recordApiRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    userAgent?: string
  ): void {
    this.apiRequestDuration
      .labels({
        method,
        route,
        status_code: statusCode.toString(),
        user_agent: userAgent || 'unknown',
      })
      .observe(duration);
  }

  /**
   * Record BullMQ job completion
   */
  recordBullMQJob(
    queueName: string,
    jobName: string,
    status: 'active' | 'completed' | 'failed' | 'waiting',
    duration?: number
  ): void {
    // Increment job counter
    this.bullmqJobsTotal
      .labels({ queue_name: queueName, job_name: jobName, status })
      .inc();

    // Record duration if provided
    if (duration !== undefined) {
      this.bullmqJobDuration
        .labels({ queue_name: queueName, job_name: jobName, status })
        .observe(duration);
    }
  }

  /**
   * Update BullMQ queue depth
   */
  updateQueueDepth(
    queueName: string,
    waiting: number,
    active: number,
    completed: number,
    failed: number
  ): void {
    this.bullmqQueueDepth
      .labels({ queue_name: queueName, status: 'waiting' })
      .set(waiting);
    this.bullmqQueueDepth
      .labels({ queue_name: queueName, status: 'active' })
      .set(active);
    this.bullmqQueueDepth
      .labels({ queue_name: queueName, status: 'completed' })
      .set(completed);
    this.bullmqQueueDepth
      .labels({ queue_name: queueName, status: 'failed' })
      .set(failed);
  }

  /**
   * Record Square API call duration
   */
  recordSquareApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number
  ): void {
    this.squareApiDuration
      .labels({
        endpoint,
        method,
        status_code: statusCode.toString(),
      })
      .observe(duration);
  }

  /**
   * Record QuickBooks API call duration
   */
  recordQuickBooksApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number
  ): void {
    this.quickbooksApiDuration
      .labels({
        endpoint,
        method,
        status_code: statusCode.toString(),
      })
      .observe(duration);
  }

  /**
   * Record database query duration
   */
  recordDatabaseQuery(
    operation: string,
    table: string,
    duration: number,
    status: 'success' | 'error'
  ): void {
    this.databaseQueryDuration
      .labels({ operation, table, status })
      .observe(duration);
  }

  /**
   * Update database connection count
   */
  updateDatabaseConnections(pool: string, count: number): void {
    this.databaseConnectionsActive.labels({ pool }).set(count);
  }

  /**
   * Record webhook reception
   */
  recordWebhookReceived(
    source: string,
    eventType: string,
    status: 'accepted' | 'rejected' | 'failed'
  ): void {
    this.webhooksReceived
      .labels({ source, event_type: eventType, status })
      .inc();
  }

  /**
   * Record order processing
   */
  recordOrderProcessed(status: 'success' | 'failed', strategy: string): void {
    this.ordersProcessed.labels({ status, strategy }).inc();
  }

  /**
   * Record mapping strategy usage
   */
  recordMappingStrategyUsed(strategyName: string, success: boolean): void {
    this.mappingStrategiesUsed
      .labels({ strategy_name: strategyName, success: success.toString() })
      .inc();
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * Reset all metrics to zero (useful for testing)
   */
  reset(): void {
    this.registry.resetMetrics();
  }
}

// Singleton instance
export const metricsService = new MetricsService();
