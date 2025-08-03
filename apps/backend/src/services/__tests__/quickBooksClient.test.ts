import nock from 'nock';
import { QuickBooksClient } from '../quickBooksClient';

describe('QuickBooksClient', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, no-unused-vars
  let quickBooksClient: any; // Will be QuickBooksClient once implemented
  const baseURL = 'https://sandbox-quickbooks.api.intuit.com';
  const accessToken = 'test-access-token';
  const realmId = 'test-realm-id';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  const environment = 'sandbox';

  // Sample sales receipt data that would be sent to QuickBooks
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  const sampleSalesReceiptData = {
    CustomerRef: {
      value: '1',
      name: 'John Doe',
    },
    Line: [
      {
        Amount: 100.0,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: {
            value: '1',
            name: 'Services',
          },
        },
      },
    ],
    TotalAmt: 100.0,
    PaymentRefNum: 'CASH-12345',
    PaymentMethodRef: {
      value: '1',
    },
  };

  // Sample QuickBooks API response for successful sales receipt creation
  const mockQuickBooksResponse = {
    QueryResponse: {
      SalesReceipt: [
        {
          Id: 'qb-receipt-123',
          SyncToken: '0',
          MetaData: {
            CreateTime: '2023-10-18T10:00:00-07:00',
            LastUpdatedTime: '2023-10-18T10:00:00-07:00',
          },
          CustomerRef: {
            value: '1',
            name: 'John Doe',
          },
          Line: [
            {
              Id: '1',
              Amount: 100.0,
              DetailType: 'SalesItemLineDetail',
              SalesItemLineDetail: {
                ItemRef: {
                  value: '1',
                  name: 'Services',
                },
                UnitPrice: 100.0,
                Qty: 1,
              },
            },
          ],
          TotalAmt: 100.0,
          Balance: 0.0,
          PaymentRefNum: 'CASH-12345',
          PaymentMethodRef: {
            value: '1',
            name: 'Cash',
          },
          domain: 'QBO',
          sparse: false,
        },
      ],
    },
  };

  // Sample QuickBooks API error response
  const mockQuickBooksErrorResponse = {
    Fault: {
      Error: [
        {
          Detail: 'The specified customer does not exist',
          code: '610',
          element: 'CustomerRef',
        },
      ],
      type: 'ValidationFault',
    },
    time: '2023-10-18T17:00:00.000Z',
  };

  beforeEach(() => {
    // Clean up any previous nock mocks
    nock.cleanAll();

    // Instantiate the client
    quickBooksClient = new QuickBooksClient({
      accessToken,
      realmId,
      environment,
    });
  });

  afterEach(() => {
    // Ensure all nock mocks have been used
    if (!nock.isDone()) {
      console.warn('Not all nock mocks were used:', nock.pendingMocks());
    }
    nock.cleanAll();
  });

  describe('constructor', () => {
    it('should throw an error if accessToken is missing', () => {
      expect(() => {
        new QuickBooksClient({
          accessToken: '',
          realmId,
          environment,
        });
      }).toThrow('Access token is required');
    });

    it('should throw an error if realmId is missing', () => {
      expect(() => {
        new QuickBooksClient({
          accessToken,
          realmId: '',
          environment,
        });
      }).toThrow('Realm ID is required');
    });

    it('should set the correct base URL for sandbox environment', () => {
      const client = new QuickBooksClient({
        accessToken,
        realmId,
        environment: 'sandbox',
      });
      expect(client.baseURL).toBe('https://sandbox-quickbooks.api.intuit.com');
    });

    it('should set the correct base URL for production environment', () => {
      const client = new QuickBooksClient({
        accessToken,
        realmId,
        environment: 'production',
      });
      expect(client.baseURL).toBe('https://quickbooks.api.intuit.com');
    });
  });

  describe('createSalesReceipt', () => {
    it('should create a sales receipt successfully', async () => {
      // Mock the QuickBooks API response using nock
      nock(baseURL)
        .post(`/v3/company/${realmId}/salesreceipt`)
        .matchHeader('Authorization', `Bearer ${accessToken}`)
        .matchHeader('Accept', 'application/json')
        .matchHeader('Content-Type', 'application/json')
        .reply(200, mockQuickBooksResponse);

      // Call the method
      const result = await quickBooksClient.createSalesReceipt(
        sampleSalesReceiptData
      );

      // Expect the result to match the mocked response
      expect(result).toEqual(
        mockQuickBooksResponse.QueryResponse.SalesReceipt[0]
      );
      expect(result.Id).toBe('qb-receipt-123');
      expect(result.TotalAmt).toBe(100.0);
      expect(result.CustomerRef.name).toBe('John Doe');
    });

    it('should handle API errors gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const invalidSalesReceiptData = {
        CustomerRef: {
          value: '999', // Non-existent customer
          name: 'Invalid Customer',
        },
        Line: [
          {
            Amount: 100.0,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: {
                value: '1',
                name: 'Services',
              },
            },
          },
        ],
        TotalAmt: 100.0,
      };

      // Mock the QuickBooks API error response
      nock(baseURL)
        .post(`/v3/company/${realmId}/salesreceipt`)
        .matchHeader('Authorization', `Bearer ${accessToken}`)
        .reply(400, mockQuickBooksErrorResponse);

      // Expect the method to throw an error with the QuickBooks error details
      await expect(
        quickBooksClient.createSalesReceipt(invalidSalesReceiptData)
      ).rejects.toThrow('The specified customer does not exist');
    });

    it('should handle network errors', async () => {
      // Mock a network timeout/error
      nock(baseURL)
        .post(`/v3/company/${realmId}/salesreceipt`)
        .matchHeader('Authorization', `Bearer ${accessToken}`)
        .replyWithError('Network timeout');

      // Expect the method to throw a network error
      await expect(
        quickBooksClient.createSalesReceipt(sampleSalesReceiptData)
      ).rejects.toThrow('Network error');
    });

    it('should validate required fields before making API call', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const invalidData = {
        // Missing required CustomerRef and Line items
        TotalAmt: 100.0,
      };

      // Should throw validation error before making API call
      await expect(
        quickBooksClient.createSalesReceipt(invalidData)
      ).rejects.toThrow('CustomerRef is required');
    });
  });

  describe('getSalesReceipt', () => {
    it('should fetch a sales receipt by ID successfully', async () => {
      const receiptId = 'qb-receipt-123';

      // Mock the QuickBooks API response for fetching a sales receipt
      nock(baseURL)
        .get(`/v3/company/${realmId}/salesreceipt/${receiptId}`)
        .matchHeader('Authorization', `Bearer ${accessToken}`)
        .matchHeader('Accept', 'application/json')
        .reply(200, mockQuickBooksResponse);

      // Call the method
      const result = await quickBooksClient.getSalesReceipt(receiptId);

      // Expect the result to match the mocked response
      expect(result).toEqual(
        mockQuickBooksResponse.QueryResponse.SalesReceipt[0]
      );
      expect(result.Id).toBe('qb-receipt-123');
    });

    it('should handle sales receipt not found error', async () => {
      const nonExistentReceiptId = 'non-existent-receipt';

      const notFoundErrorResponse = {
        Fault: {
          Error: [
            {
              Detail: 'Object Not Found',
              code: '610',
              element: 'SalesReceipt',
            },
          ],
          type: 'ValidationFault',
        },
        time: '2023-10-18T17:00:00.000Z',
      };

      // Mock the QuickBooks API error response
      nock(baseURL)
        .get(`/v3/company/${realmId}/salesreceipt/${nonExistentReceiptId}`)
        .matchHeader('Authorization', `Bearer ${accessToken}`)
        .reply(404, notFoundErrorResponse);

      // Expect the method to throw a not found error
      await expect(
        quickBooksClient.getSalesReceipt(nonExistentReceiptId)
      ).rejects.toThrow('Object Not Found');
    });
  });

  describe('authentication', () => {
    it('should include proper authentication headers in all requests', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      let authHeaderCaptured = '';

      // Mock with header capture - use a more flexible approach
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const scope = nock(baseURL)
        .post(`/v3/company/${realmId}/salesreceipt`)
        .query(true) // Accept any query parameters
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
        .reply(function (_uri, _requestBody) {
          // Capture the authorization header from the actual request
          const authHeader = this.req.getHeader('authorization');
          authHeaderCaptured = Array.isArray(authHeader)
            ? String(authHeader[0] || '')
            : String(authHeader || '');
          return [200, mockQuickBooksResponse];
        });

      // Make a request
      await quickBooksClient.createSalesReceipt(sampleSalesReceiptData);

      // Verify the authorization header was set correctly
      expect(authHeaderCaptured).toBe(`Bearer ${accessToken}`);
    });
  });
});
