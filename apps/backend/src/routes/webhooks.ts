import { Router, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  SquareWebhookSchema,
  SquareWebhookPayload,
} from '../schemas/webhookSchema';
import { QueueService } from '../services/queueService';

const router = Router();

/**
 * POST /square
 * Receives and processes Square webhook notifications
 */
router.post('/square', async (req: Request, res: Response) => {
  try {
    console.log('🔔 Received Square webhook:', {
      headers: {
        'x-square-signature': req.get('X-Square-Signature'),
        'content-type': req.get('Content-Type'),
      },
      body: req.body,
    });

    // Validate the webhook payload using Zod schema
    const validatedPayload: SquareWebhookPayload = SquareWebhookSchema.parse(
      req.body
    );

    console.log('✅ Webhook validation passed:', {
      eventType: validatedPayload.type,
      orderId: validatedPayload.data.id,
      merchantId: validatedPayload.merchant_id,
    });

    // Initialize queue service and add job for background processing
    const queueService = new QueueService();

    try {
      // Add the webhook payload to the processing queue
      const jobId = await queueService.addOrderJob(validatedPayload);

      console.log('📝 Order processing job queued:', jobId);

      // Return 202 Accepted as per OpenAPI spec
      res.status(202).json({
        status: 'accepted',
        message: 'Webhook received and queued for processing',
        jobId,
        orderId: validatedPayload.data.id,
      });
    } catch (queueError) {
      console.error('❌ Failed to queue order processing job:', queueError);

      // Return 500 if we can't queue the job
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to queue order for processing',
        code: 'QUEUE_ERROR',
      });
      return;
    }
  } catch (error) {
    console.error('❌ Webhook processing error:', error);

    if (error instanceof ZodError) {
      // Validation error - return 400 Bad Request
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid webhook payload structure',
        code: 'INVALID_PAYLOAD',
        details: error.errors,
      });
      return;
    }

    // Generic server error - return 500 Internal Server Error
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while processing the webhook',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;
