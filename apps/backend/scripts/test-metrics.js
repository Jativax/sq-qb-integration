// Simple Node.js script to test metrics functionality
const express = require('express');

// Create a mock metricsService to verify the functionality
const mockMetricsService = {
  getMetrics: async () => {
    return `
# HELP api_request_duration_seconds Duration of HTTP API requests in seconds
# TYPE api_request_duration_seconds histogram
api_request_duration_seconds_bucket{method="GET",route="/",status_code="200",user_agent="curl",le="0.1"} 1
api_request_duration_seconds_bucket{method="GET",route="/",status_code="200",user_agent="curl",le="0.3"} 1
api_request_duration_seconds_bucket{method="GET",route="/",status_code="200",user_agent="curl",le="+Inf"} 1
api_request_duration_seconds_sum{method="GET",route="/",status_code="200",user_agent="curl"} 0.005
api_request_duration_seconds_count{method="GET",route="/",status_code="200",user_agent="curl"} 1

# HELP bullmq_jobs_total Total number of BullMQ jobs processed by status
# TYPE bullmq_jobs_total counter
bullmq_jobs_total{queue_name="order-processing",job_name="process-order",status="completed"} 5

# HELP square_api_duration_seconds Duration of Square API calls in seconds
# TYPE square_api_duration_seconds histogram
square_api_duration_seconds_bucket{endpoint="/v2/orders/{orderId}",method="GET",status_code="200",le="0.5"} 3
square_api_duration_seconds_bucket{endpoint="/v2/orders/{orderId}",method="GET",status_code="200",le="+Inf"} 3
square_api_duration_seconds_sum{endpoint="/v2/orders/{orderId}",method="GET",status_code="200"} 0.75
square_api_duration_seconds_count{endpoint="/v2/orders/{orderId}",method="GET",status_code="200"} 3

# HELP quickbooks_api_duration_seconds Duration of QuickBooks API calls in seconds
# TYPE quickbooks_api_duration_seconds histogram
quickbooks_api_duration_seconds_bucket{endpoint="/v3/company/{realmId}/salesreceipt",method="POST",status_code="200",le="1"} 2
quickbooks_api_duration_seconds_bucket{endpoint="/v3/company/{realmId}/salesreceipt",method="POST",status_code="200",le="+Inf"} 2
quickbooks_api_duration_seconds_sum{endpoint="/v3/company/{realmId}/salesreceipt",method="POST",status_code="200"} 1.2
quickbooks_api_duration_seconds_count{endpoint="/v3/company/{realmId}/salesreceipt",method="POST",status_code="200"} 2

# HELP bullmq_queue_depth Number of jobs waiting in BullMQ queues
# TYPE bullmq_queue_depth gauge
bullmq_queue_depth{queue_name="order-processing",status="waiting"} 3
bullmq_queue_depth{queue_name="order-processing",status="active"} 1
bullmq_queue_depth{queue_name="order-processing",status="completed"} 25
bullmq_queue_depth{queue_name="order-processing",status="failed"} 1

# HELP webhooks_received_total Total number of webhooks received
# TYPE webhooks_received_total counter
webhooks_received_total{source="square",event_type="order.created",status="accepted"} 12

# HELP orders_processed_total Total number of orders processed through the integration
# TYPE orders_processed_total counter
orders_processed_total{status="success",strategy="default"} 10
orders_processed_total{status="failed",strategy="default"} 2

# HELP mapping_strategies_used_total Total number of times each mapping strategy was used
# TYPE mapping_strategies_used_total counter
mapping_strategies_used_total{strategy_name="default",success="true"} 10
mapping_strategies_used_total{strategy_name="default",success="false"} 2
`;
  },
};

const app = express();

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await mockMetricsService.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'Square-QuickBooks Integration API - Metrics Demo',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🎯 Metrics demo server running on http://localhost:${PORT}`);
  console.log(`📊 Metrics endpoint: http://localhost:${PORT}/metrics`);
  console.log('✨ Test with: curl http://localhost:3002/metrics');
});
