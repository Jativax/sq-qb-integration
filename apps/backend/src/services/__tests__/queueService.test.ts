import { QueueService } from '../queueService';
import { SquareWebhookPayload } from '../../schemas/webhookSchema';

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mocked-job-id' }),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('QueueService', () => {
  let queueService: QueueService;

  const sampleWebhookPayload: SquareWebhookPayload = {
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

  beforeEach(() => {
    queueService = new QueueService();
  });

  afterEach(async () => {
    await queueService.close();
  });

  describe('addOrderJob', () => {
    it('should add a job to the queue and return job ID', async () => {
      const jobId = await queueService.addOrderJob(sampleWebhookPayload);

      expect(jobId).toBe('mocked-job-id');
      expect(queueService['queue'].add).toHaveBeenCalledWith(
        'process-order',
        sampleWebhookPayload,
        expect.objectContaining({
          jobId: expect.stringMatching(/^order-square-order-456-\d+$/),
          priority: 1,
          delay: 0,
        })
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await queueService.getQueueStats();

      expect(stats).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      });
    });
  });

  describe('close', () => {
    it('should close the queue connection', async () => {
      await queueService.close();

      expect(queueService['queue'].close).toHaveBeenCalled();
    });
  });
});
