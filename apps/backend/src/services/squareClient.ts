import fetch from 'node-fetch';
import { metricsService } from './metricsService';

export interface SquareOrder {
  id: string;
  location_id: string;
  order_id: string;
  state: 'OPEN' | 'COMPLETED' | 'CANCELED';
  version: number;
  created_at: string;
  updated_at: string;
  total_money?: {
    amount: number;
    currency: string;
  };
  line_items?: Array<{
    uid: string;
    name: string;
    quantity: string;
    base_price_money?: {
      amount: number;
      currency: string;
    };
    total_money?: {
      amount: number;
      currency: string;
    };
  }>;
}

export interface SquareApiClientConfig {
  accessToken: string;
  applicationId: string;
  environment: 'production' | 'sandbox';
}

export interface SquareApiResponse<T> {
  order?: T;
  errors?: Array<{
    category: string;
    code: string;
    detail: string;
  }>;
}

export class SquareApiClient {
  private accessToken: string;
  private applicationId: string;
  public readonly baseURL: string;

  constructor(config: SquareApiClientConfig) {
    if (!config.accessToken || config.accessToken.trim() === '') {
      throw new Error('Access token is required');
    }

    if (!config.applicationId || config.applicationId.trim() === '') {
      throw new Error('Application ID is required');
    }

    this.accessToken = config.accessToken;
    this.applicationId = config.applicationId;

    // Set base URL based on environment
    this.baseURL =
      config.environment === 'sandbox'
        ? 'https://connect.squareupsandbox.com'
        : 'https://connect.squareup.com';
  }

  async getOrderById(orderId: string): Promise<SquareOrder> {
    // CI/E2E bypass to avoid external dependency failures
    if (process.env['MOCK_EXTERNAL_APIS'] === 'true') {
      return this.getMockOrder(orderId);
    }

    if (!orderId || orderId.trim() === '') {
      throw new Error('Order ID is required');
    }

    const url = `${this.baseURL}/v2/orders/${orderId}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Square-Version': '2023-10-18',
          'Content-Type': 'application/json',
        },
      });

      const duration = (Date.now() - startTime) / 1000;

      // Record API call metrics
      metricsService.recordSquareApiCall(
        '/v2/orders/{orderId}',
        'GET',
        response.status,
        duration
      );

      const responseBody =
        (await response.json()) as SquareApiResponse<SquareOrder>;

      if (!response.ok) {
        // Handle Square API errors
        if (responseBody.errors && responseBody.errors.length > 0) {
          const error = responseBody.errors[0];
          throw new Error(
            error?.detail || `Square API error: ${error?.code || 'Unknown'}`
          );
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!responseBody.order) {
        throw new Error('No order data in response');
      }

      return responseBody.order;
    } catch (error) {
      // Record failed API call metrics if we haven't already
      const duration = (Date.now() - startTime) / 1000;
      metricsService.recordSquareApiCall(
        '/v2/orders/{orderId}',
        'GET',
        500, // Assume 500 for network/parsing errors
        duration
      );

      // Re-throw with more context if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error');
      }
      throw error;
    }
  }

  private getMockOrder(orderId: string): SquareOrder {
    const now = new Date().toISOString();
    return {
      id: orderId,
      location_id: 'test-location',
      order_id: orderId,
      state: 'OPEN',
      version: 1,
      created_at: now,
      updated_at: now,
      total_money: { amount: 1000, currency: 'USD' },
      line_items: [
        {
          uid: 'item-1',
          name: 'Test Product',
          quantity: '1',
          base_price_money: { amount: 1000, currency: 'USD' },
          total_money: { amount: 1000, currency: 'USD' },
        },
      ],
    } as SquareOrder;
  }
}
