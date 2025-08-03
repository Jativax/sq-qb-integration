import fetch from 'node-fetch';

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
    if (!orderId || orderId.trim() === '') {
      throw new Error('Order ID is required');
    }

    const url = `${this.baseURL}/v2/orders/${orderId}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Square-Version': '2023-10-18',
          'Content-Type': 'application/json',
        },
      });

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
      // Re-throw with more context if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error');
      }
      throw error;
    }
  }
}
