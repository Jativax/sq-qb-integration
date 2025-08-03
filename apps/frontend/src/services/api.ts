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

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  userId: string | null;
  details: Record<string, any>;
  createdAt: string;
}

export interface AuditLogsResponse {
  status: string;
  data: AuditLog[];
  count: number;
  filters: {
    limit: number;
    action: string | null;
    userId: string | null;
  };
  timestamp: string;
}

export interface AuditLogStats {
  totalLogs: number;
  actionCounts: Record<string, number>;
  userCounts: Record<string, number>;
  mostCommonAction: string;
  mostActiveUser: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: 'ADMIN' | 'VIEWER';
  };
}

export interface UserInfo {
  id: string;
  email: string;
  role: 'ADMIN' | 'VIEWER';
  createdAt: string;
  updatedAt: string;
}

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

    // Request interceptor - add auth token and logging
    this.client.interceptors.request.use(
      config => {
        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log request
        console.log(
          `Making ${config.method?.toUpperCase()} request to ${config.url}`
        );
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for handling auth errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      error => {
        console.error('API Error:', error.response?.data || error.message);

        // Handle auth errors
        if (error.response?.status === 401) {
          // Token expired or invalid, clear auth and redirect to login
          this.clearAuth();
          window.location.href = '/login';
        }

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

  // Get audit logs with optional filtering
  async getAuditLogs(params?: {
    limit?: number;
    action?: string;
    userId?: string;
  }): Promise<AuditLog[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.action) searchParams.append('action', params.action);
    if (params?.userId) searchParams.append('userId', params.userId);

    const queryString = searchParams.toString();
    const url = `/api/v1/audit-logs${queryString ? `?${queryString}` : ''}`;

    const response = await this.client.get<AuditLogsResponse>(url);
    return response.data.data;
  }

  // Get available audit log actions for filtering
  async getAuditLogActions(): Promise<string[]> {
    const response = await this.client.get<{
      status: string;
      data: string[];
      count: number;
      timestamp: string;
    }>('/api/v1/audit-logs/actions');
    return response.data.data;
  }

  // Get audit log statistics
  async getAuditLogStats(): Promise<AuditLogStats> {
    const response = await this.client.get<{
      status: string;
      data: AuditLogStats;
      timestamp: string;
    }>('/api/v1/audit-logs/stats');
    return response.data.data;
  }

  // Analytics methods
  async getAnalyticsMetrics(): Promise<AnalyticsMetrics> {
    const response = await this.client.get<{
      status: string;
      data: AnalyticsMetrics;
      timestamp: string;
    }>('/api/v1/analytics/metrics');
    return response.data.data;
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await this.client.post<{
      status: string;
      data: LoginResponse;
    }>('/api/v1/auth/login', credentials);

    const loginData = response.data.data;

    // Store token securely
    this.setAuthToken(loginData.token);

    return loginData;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/api/v1/auth/logout');
    } finally {
      // Always clear auth data, even if logout request fails
      this.clearAuth();
    }
  }

  async getCurrentUser(): Promise<UserInfo> {
    const response = await this.client.get<{
      status: string;
      data: { user: UserInfo };
    }>('/api/v1/auth/me');
    return response.data.data.user;
  }

  async refreshSession(): Promise<UserInfo> {
    const response = await this.client.post<{
      status: string;
      data: { user: UserInfo };
    }>('/api/v1/auth/refresh');
    return response.data.data.user;
  }

  // Auth token management
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  private clearAuth(): void {
    localStorage.removeItem('auth_token');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }
}

export const apiClient = new ApiClient();
export default apiClient;
