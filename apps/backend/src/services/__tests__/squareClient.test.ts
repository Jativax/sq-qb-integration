import nock from 'nock';
import { SquareApiClient } from '../squareClient';

describe('SquareApiClient', () => {
  let squareClient: SquareApiClient;
  const baseURL = 'https://connect.squareupsandbox.com'; // Fixed to match sandbox environment
  const accessToken = 'test-access-token';
  const applicationId = 'test-app-id';

  beforeEach(() => {
    squareClient = new SquareApiClient({
      accessToken,
      applicationId,
      environment: 'sandbox',
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('getOrderById', () => {
    it('should fetch an order by ID successfully', async () => {
      const orderId = 'CAISEM82RcpmcFBM0TfOyiHV3es';
      const mockOrderResponse = {
        order: {
          id: orderId,
          location_id: 'S8GWD5R9QB',
          order_id: orderId,
          state: 'COMPLETED',
          version: 1,
          created_at: '2023-01-01T12:00:00Z',
          updated_at: '2023-01-01T12:05:00Z',
          total_money: {
            amount: 1500,
            currency: 'USD',
          },
          line_items: [
            {
              uid: 'BWJA5Q0QFUUUFLP0KQHXBSNW',
              name: 'Coffee',
              quantity: '1',
              base_price_money: {
                amount: 1500,
                currency: 'USD',
              },
              total_money: {
                amount: 1500,
                currency: 'USD',
              },
            },
          ],
        },
      };

      // Mock the Square API call
      const scope = nock(baseURL)
        .get(`/v2/orders/${orderId}`)
        .matchHeader('Authorization', `Bearer ${accessToken}`)
        .matchHeader('Square-Version', '2023-10-18')
        .matchHeader('Content-Type', 'application/json')
        .reply(200, mockOrderResponse);

      // Call the method that doesn't exist yet (TDD approach)
      const result = await squareClient.getOrderById(orderId);

      // Assertions
      expect(result).toEqual(mockOrderResponse.order);
      expect(scope.isDone()).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      const orderId = 'invalid-order-id';
      const mockErrorResponse = {
        errors: [
          {
            category: 'INVALID_REQUEST_ERROR',
            code: 'NOT_FOUND',
            detail: 'Order not found',
          },
        ],
      };

      // Mock the Square API error response
      const scope = nock(baseURL)
        .get(`/v2/orders/${orderId}`)
        .matchHeader('Authorization', `Bearer ${accessToken}`)
        .reply(404, mockErrorResponse);

      // Expect the method to throw an error
      await expect(squareClient.getOrderById(orderId)).rejects.toThrow(
        'Order not found'
      );

      expect(scope.isDone()).toBe(true);
    });

    it('should handle network errors', async () => {
      const orderId = 'network-error-order';

      // Mock a network error
      const scope = nock(baseURL)
        .get(`/v2/orders/${orderId}`)
        .replyWithError('Network error');

      // Expect the method to throw a network error
      await expect(squareClient.getOrderById(orderId)).rejects.toThrow(
        'Network error'
      );

      expect(scope.isDone()).toBe(true);
    });
  });

  describe('constructor', () => {
    it('should throw an error if accessToken is missing', () => {
      expect(() => {
        new SquareApiClient({
          accessToken: '',
          applicationId,
          environment: 'sandbox',
        });
      }).toThrow('Access token is required');
    });

    it('should throw an error if applicationId is missing', () => {
      expect(() => {
        new SquareApiClient({
          accessToken,
          applicationId: '',
          environment: 'sandbox',
        });
      }).toThrow('Application ID is required');
    });

    it('should set the correct base URL for sandbox environment', () => {
      const client = new SquareApiClient({
        accessToken,
        applicationId,
        environment: 'sandbox',
      });

      expect(client.baseURL).toBe('https://connect.squareupsandbox.com');
    });

    it('should set the correct base URL for production environment', () => {
      const client = new SquareApiClient({
        accessToken,
        applicationId,
        environment: 'production',
      });

      expect(client.baseURL).toBe('https://connect.squareup.com');
    });
  });
});
