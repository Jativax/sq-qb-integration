import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

// API Types
export interface WebhookEvent {
  id: string;
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object: unknown;
  };
}

export interface OrderProcessingStats {
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  pendingOrders: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface FailedJob {
  id: string;
  data: {
    type: string;
    merchant_id: string;
    event_id: string;
    created_at: string;
    data: {
      id: string;
      type: string;
      object: unknown;
    };
  };
  failedReason: string;
  attemptsMade: number;
  timestamp: string;
}

export interface FailedJobsResponse {
  status: string;
  data: FailedJob[];
  count: number;
  timestamp: string;
}

export interface RetryJobResponse {
  status: string;
  message: string;
  jobId: string;
  timestamp: string;
}

export interface ApiResponse<T> {
  data: T;
  status: string;
  message?: string;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      config => {
        console.log(
          `Making ${config.method?.toUpperCase()} request to ${config.url}`
        );
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      error => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async getHealth(): Promise<{
    status: string;
    timestamp: string;
    message: string;
  }> {
    const response = await this.client.get('/');
    return response.data;
  }

  // Get Prometheus metrics (for dashboard monitoring)
  async getMetrics(): Promise<string> {
    const response = await this.client.get('/metrics', {
      headers: { Accept: 'text/plain' },
    });
    return response.data;
  }

  // Mock API methods for dashboard data (these would be real endpoints in production)
  async getOrderStats(): Promise<OrderProcessingStats> {
    // This would be a real API endpoint in production
    // For now, return mock data
    return {
      totalOrders: 127,
      successfulOrders: 118,
      failedOrders: 5,
      pendingOrders: 4,
    };
  }

  async getQueueStats(): Promise<QueueStats> {
    // This would be a real API endpoint in production
    // For now, return mock data
    return {
      waiting: 3,
      active: 1,
      completed: 145,
      failed: 8,
    };
  }

  async getRecentWebhooks(): Promise<WebhookEvent[]> {
    // This would be a real API endpoint in production
    // For now, return mock data
    return [
      {
        id: '1',
        merchant_id: 'merchant-123',
        type: 'order.created',
        event_id: 'event-456',
        created_at: new Date().toISOString(),
        data: {
          type: 'order',
          id: 'order-789',
          object: {
            id: 'order-789',
            total_money: { amount: 1500, currency: 'USD' },
          },
        },
      },
      {
        id: '2',
        merchant_id: 'merchant-123',
        type: 'order.updated',
        event_id: 'event-457',
        created_at: new Date(Date.now() - 60000).toISOString(),
        data: {
          type: 'order',
          id: 'order-790',
          object: {
            id: 'order-790',
            total_money: { amount: 2500, currency: 'USD' },
          },
        },
      },
    ];
  }

  // Get failed jobs from the queue
  async getFailedJobs(): Promise<FailedJob[]> {
    const response = await this.client.get<FailedJobsResponse>(
      '/api/v1/jobs/failed'
    );
    return response.data.data;
  }

  // Retry a specific failed job
  async retryJob(jobId: string): Promise<RetryJobResponse> {
    const response = await this.client.post<RetryJobResponse>(
      `/api/v1/jobs/${jobId}/retry`
    );
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
