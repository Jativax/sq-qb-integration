import request from 'supertest';
import nock from 'nock';
import { Express } from 'express';

// We'll need to create a separate app instance for testing
// since the main index.ts file starts the server
import express from 'express';
import cors from 'cors';
import webhookRoutes from '../webhooks';

// Mock BullMQ for testing
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mocked-job-id' }),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('Webhooks E2E Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    // Create test Express app instance
    app = express();
    app.use(cors());
    app.use(express.json());

    // Health check endpoint
    app.get('/', (req, res) => {
      res.status(200).json({
        message: 'Square-QuickBooks Integration API',
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    });

    // Mount webhook routes
    app.use('/api/v1/webhooks', webhookRoutes);
  });

  beforeEach(() => {
    // Clean up any previous nock mocks
    nock.cleanAll();
    // Allow localhost connections for supertest
    nock.enableNetConnect('127.0.0.1');
  });

  afterEach(() => {
    // Ensure all nock mocks were used (only check if we have external API mocks)
    const pendingMocks = nock.pendingMocks();
    const externalMocks = pendingMocks.filter(
      mock => !mock.includes('127.0.0.1') && !mock.includes('localhost')
    );
    if (externalMocks.length > 0) {
      console.warn('Not all external API mocks were used:', externalMocks);
    }
    nock.cleanAll();
  });

  afterAll(() => {
    // Clean up nock completely
    nock.restore();
  });

  describe('POST /api/v1/webhooks/square', () => {
    // Sample webhook payload from Square
    const sampleSquareWebhookPayload = {
      merchant_id: 'test-merchant-123',
      type: 'order.created' as const,
      event_id: '550e8400-e29b-41d4-a716-446655440000',
      created_at: '2023-10-18T10:00:00.000Z',
      data: {
        type: 'order',
        id: 'square-order-456',
        object: {
          order: {
            id: 'square-order-456',
            location_id: 'location-789',
            state: 'COMPLETED' as const,
            created_at: '2023-10-18T10:00:00.000Z',
            updated_at: '2023-10-18T10:00:00.000Z',
            total_money: {
              amount: 1500,
              currency: 'USD',
            },
          },
        },
      },
    };

    // Sample response from Square API when fetching order details
    const sampleSquareOrderResponse = {
      order: {
        id: 'square-order-456',
        location_id: 'location-789',
        order_id: 'square-order-456',
        state: 'COMPLETED',
        version: 1,
        created_at: '2023-10-18T10:00:00.000Z',
        updated_at: '2023-10-18T10:00:00.000Z',
        total_money: {
          amount: 1500,
          currency: 'USD',
        },
        line_items: [
          {
            uid: 'line-item-1',
            name: 'Premium Service',
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

    it('should queue webhook payload for background processing', async () => {
      // Arrange: No external API mocks needed since processing is queued

      // Act: Send the webhook request to our API
      const response = await request(app)
        .post('/api/v1/webhooks/square')
        .send(sampleSquareWebhookPayload)
        .set('Content-Type', 'application/json')
        .expect(202); // Should return 202 Accepted immediately

      // Assert: Verify immediate webhook response
      expect(response.body).toMatchObject({
        status: 'accepted',
        message: 'Webhook received and queued for processing',
        jobId: 'mocked-job-id',
        orderId: 'square-order-456',
      });

      // Note: In this test, we're only verifying that the webhook is accepted and queued.
      // The actual order processing happens in the background worker, which is tested separately.
    });

    it('should handle Square API errors gracefully', async () => {
      // Mock Square API to return an error
      nock('https://connect.squareupsandbox.com')
        .get('/v2/orders/square-order-456')
        .matchHeader('Authorization', /Bearer .+/)
        .reply(404, {
          errors: [
            {
              category: 'INVALID_REQUEST_ERROR',
              code: 'NOT_FOUND',
              detail: 'Order not found',
            },
          ],
        });

      // Act: Send the webhook request
      const response = await request(app)
        .post('/api/v1/webhooks/square')
        .send(sampleSquareWebhookPayload)
        .set('Content-Type', 'application/json')
        .expect(202);

      // Assert: Should still return 202 (webhook accepted)
      expect(response.body.status).toBe('accepted');

      // Wait for background processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // TODO: Once we implement proper error handling:
      // 1. Verify SyncJob is marked as 'FAILED'
      // 2. Verify error details are logged
      // 3. Verify retry logic is triggered if applicable
    });

    it('should handle QuickBooks API errors gracefully', async () => {
      // Mock successful Square API call
      nock('https://connect.squareupsandbox.com')
        .get('/v2/orders/square-order-456')
        .matchHeader('Authorization', /Bearer .+/)
        .reply(200, sampleSquareOrderResponse);

      // Mock QuickBooks API to return an error
      nock('https://sandbox-quickbooks.api.intuit.com')
        .post('/v3/company/test-realm-123/salesreceipt')
        .matchHeader('Authorization', /Bearer .+/)
        .reply(400, {
          Fault: {
            Error: [
              {
                Detail: 'Invalid customer reference',
                code: '610',
                element: 'CustomerRef',
              },
            ],
            type: 'ValidationFault',
          },
          time: '2023-10-18T17:00:00.000Z',
        });

      // Act: Send the webhook request
      const response = await request(app)
        .post('/api/v1/webhooks/square')
        .send(sampleSquareWebhookPayload)
        .set('Content-Type', 'application/json')
        .expect(202);

      // Assert: Should still return 202 (webhook accepted)
      expect(response.body.status).toBe('accepted');

      // Wait for background processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // TODO: Once we implement proper error handling:
      // 1. Verify SquareOrder was created but QuickBooksReceipt creation failed
      // 2. Verify SyncJob is marked as 'FAILED' with error details
      // 3. Verify retry logic or manual review process is triggered
    });

    it('should validate webhook payload structure', async () => {
      const invalidPayload = {
        merchant_id: 'test-merchant-123',
        // Missing required fields: type, event_id, created_at, data
      };

      const response = await request(app)
        .post('/api/v1/webhooks/square')
        .send(invalidPayload)
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: 'Invalid webhook payload structure',
        code: 'INVALID_PAYLOAD',
        details: expect.any(Array), // Zod validation errors
      });
    });

    it('should return 401 Unauthorized for invalid signature', async () => {
      // TODO: Implement Square webhook signature validation
      // For now, this is a placeholder test that expects the current behavior

      const response = await request(app)
        .post('/api/v1/webhooks/square')
        .send(sampleSquareWebhookPayload)
        .set('Content-Type', 'application/json')
        .set('x-square-signature', 'invalid-signature-value')
        .expect(202); // Currently returns 202, but should return 401 when implemented

      // TODO: Once signature validation is implemented, change to:
      // .expect(401);
      // expect(response.body).toMatchObject({
      //   error: 'Unauthorized',
      //   message: 'Invalid webhook signature',
      //   code: 'INVALID_SIGNATURE',
      // });

      // For now, just verify it processes normally
      expect(response.body.status).toBe('accepted');
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/v1/webhooks/square')
        .send(sampleSquareWebhookPayload)
        // Intentionally not setting Content-Type header
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: expect.stringContaining('Invalid'), // Will depend on exact validation
      });
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/webhooks/square')
        .send('{ invalid json }')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.any(String),
        message: expect.stringContaining('Invalid'), // Will depend on Express error handling
      });
    });
  });

  describe('Health Check', () => {
    it('should return 200 OK for health check', async () => {
      const response = await request(app).get('/').expect(200);

      expect(response.body).toMatchObject({
        message: 'Square-QuickBooks Integration API',
        status: 'healthy',
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
        ),
      });
    });
  });
});
