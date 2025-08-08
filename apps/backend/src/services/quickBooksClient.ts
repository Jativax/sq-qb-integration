import fetch from 'node-fetch';
import { metricsService } from './metricsService';
import logger from './logger';
import config from '../config';

// QuickBooks API Type Definitions
export interface QBCustomerRef {
  value: string;
  name?: string;
}

export interface QBItemRef {
  value: string;
  name?: string;
}

export interface QBSalesItemLineDetail {
  ItemRef: QBItemRef;
  UnitPrice?: number;
  Qty?: number;
}

export interface QBLine {
  Id?: string;
  Amount: number;
  DetailType: 'SalesItemLineDetail';
  SalesItemLineDetail: QBSalesItemLineDetail;
}

export interface QBPaymentMethodRef {
  value: string;
  name?: string;
}

export interface QBMetaData {
  CreateTime?: string;
  LastUpdatedTime?: string;
}

export interface QBSalesReceipt {
  Id?: string;
  SyncToken?: string;
  MetaData?: QBMetaData;
  CustomerRef: QBCustomerRef;
  Line: QBLine[];
  TotalAmt: number;
  Balance?: number;
  PaymentRefNum?: string;
  PaymentMethodRef?: QBPaymentMethodRef;
  domain?: string;
  sparse?: boolean;
}

export interface QBSalesReceiptData {
  CustomerRef: QBCustomerRef;
  Line: QBLine[];
  TotalAmt: number;
  PaymentRefNum?: string;
  PaymentMethodRef?: QBPaymentMethodRef;
}

export interface QBError {
  Detail: string;
  code: string;
  element?: string;
}

export interface QBFault {
  Error: QBError[];
  type: string;
}

export interface QBErrorResponse {
  Fault: QBFault;
  time: string;
}

export interface QBSuccessResponse {
  QueryResponse: {
    SalesReceipt: QBSalesReceipt[];
  };
}

export interface QuickBooksClientConfig {
  accessToken: string;
  realmId: string;
  environment: 'sandbox' | 'production';
}

export class QuickBooksClient {
  private accessToken: string;
  private realmId: string;
  public readonly baseURL: string;

  constructor(config: QuickBooksClientConfig) {
    if (!config.accessToken || config.accessToken.trim() === '') {
      throw new Error('Access token is required');
    }

    if (!config.realmId || config.realmId.trim() === '') {
      throw new Error('Realm ID is required');
    }

    this.accessToken = config.accessToken;
    this.realmId = config.realmId;

    // Set base URL based on environment
    this.baseURL =
      config.environment === 'sandbox'
        ? 'https://sandbox-quickbooks.api.intuit.com'
        : 'https://quickbooks.api.intuit.com';
  }

  async createSalesReceipt(
    salesReceiptData: QBSalesReceiptData
  ): Promise<QBSalesReceipt> {
    // CI/E2E bypass to avoid external dependency failures
    if (process.env['MOCK_EXTERNAL_APIS'] === 'true') {
      const now = new Date().toISOString();
      return {
        Id: `mock-receipt-${Date.now()}`,
        SyncToken: '0',
        MetaData: { CreateTime: now, LastUpdatedTime: now },
        CustomerRef: { value: '1', name: 'Test Customer' },
        Line: [
          {
            Amount: salesReceiptData.TotalAmt,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: { ItemRef: { value: '1', name: 'Test Item' } },
          },
        ],
        TotalAmt: salesReceiptData.TotalAmt,
        Balance: 0,
      } as QBSalesReceipt;
    }
    if (!salesReceiptData) {
      throw new Error('Sales receipt data is required');
    }

    // Validate required fields
    if (!salesReceiptData.CustomerRef) {
      throw new Error('CustomerRef is required');
    }

    if (!salesReceiptData.Line || salesReceiptData.Line.length === 0) {
      throw new Error('Line items are required');
    }

    const url = `${this.baseURL}/v3/company/${this.realmId}/salesreceipt`;
    const startTime = Date.now();

    // Check for forced failure (for testing purposes)
    if (config.FORCE_QB_FAILURE === 'true') {
      logger.info(
        'Forced failure mode enabled - simulating QuickBooks API error'
      );
      // Disable forced failure after first use
      delete process.env['FORCE_QB_FAILURE'];
      const duration = (Date.now() - startTime) / 1000;
      metricsService.recordQuickBooksApiCall(
        '/v3/company/{realmId}/salesreceipt',
        'POST',
        500,
        duration
      );
      throw new Error('Forced QuickBooks API failure for testing');
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(salesReceiptData),
      });

      const duration = (Date.now() - startTime) / 1000;

      // Record API call metrics
      metricsService.recordQuickBooksApiCall(
        '/v3/company/{realmId}/salesreceipt',
        'POST',
        response.status,
        duration
      );

      const responseBody = (await response.json()) as
        | QBSuccessResponse
        | QBErrorResponse;

      if (!response.ok) {
        // Handle QuickBooks API errors
        if ('Fault' in responseBody) {
          const errorResponse = responseBody as QBErrorResponse;
          if (
            errorResponse.Fault.Error &&
            errorResponse.Fault.Error.length > 0
          ) {
            const error = errorResponse.Fault.Error[0];
            throw new Error(
              error?.Detail ||
                `QuickBooks API error: ${error?.code || 'Unknown'}`
            );
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const successResponse = responseBody as QBSuccessResponse;
      if (!successResponse.QueryResponse?.SalesReceipt?.[0]) {
        throw new Error('No sales receipt data in response');
      }

      return successResponse.QueryResponse.SalesReceipt[0];
    } catch (error) {
      // Record failed API call metrics if we haven't already
      const duration = (Date.now() - startTime) / 1000;
      metricsService.recordQuickBooksApiCall(
        '/v3/company/{realmId}/salesreceipt',
        'POST',
        500, // Assume 500 for network/parsing errors
        duration
      );

      // Re-throw with more context if it's a network error
      if (
        error instanceof Error &&
        (error.name === 'FetchError' ||
          error.message.includes('fetch') ||
          error.message.includes('Network timeout'))
      ) {
        throw new Error('Network error');
      }
      throw error;
    }
  }

  async getSalesReceipt(receiptId: string): Promise<QBSalesReceipt> {
    if (!receiptId || receiptId.trim() === '') {
      throw new Error('Receipt ID is required');
    }

    const url = `${this.baseURL}/v3/company/${this.realmId}/salesreceipt/${receiptId}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: 'application/json',
        },
      });

      const duration = (Date.now() - startTime) / 1000;

      // Record API call metrics
      metricsService.recordQuickBooksApiCall(
        '/v3/company/{realmId}/salesreceipt/{receiptId}',
        'GET',
        response.status,
        duration
      );

      const responseBody = (await response.json()) as
        | QBSuccessResponse
        | QBErrorResponse;

      if (!response.ok) {
        // Handle QuickBooks API errors
        if ('Fault' in responseBody) {
          const errorResponse = responseBody as QBErrorResponse;
          if (
            errorResponse.Fault.Error &&
            errorResponse.Fault.Error.length > 0
          ) {
            const error = errorResponse.Fault.Error[0];
            throw new Error(
              error?.Detail ||
                `QuickBooks API error: ${error?.code || 'Unknown'}`
            );
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const successResponse = responseBody as QBSuccessResponse;
      if (!successResponse.QueryResponse?.SalesReceipt?.[0]) {
        throw new Error('No sales receipt data in response');
      }

      return successResponse.QueryResponse.SalesReceipt[0];
    } catch (error) {
      // Record failed API call metrics if we haven't already
      const duration = (Date.now() - startTime) / 1000;
      metricsService.recordQuickBooksApiCall(
        '/v3/company/{realmId}/salesreceipt/{receiptId}',
        'GET',
        500, // Assume 500 for network/parsing errors
        duration
      );

      // Re-throw with more context if it's a network error
      if (
        error instanceof Error &&
        (error.name === 'FetchError' ||
          error.message.includes('fetch') ||
          error.message.includes('Network timeout'))
      ) {
        throw new Error('Network error');
      }
      throw error;
    }
  }
}
