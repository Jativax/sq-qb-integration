import fetch from 'node-fetch';

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

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: 'application/json',
        },
      });

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
