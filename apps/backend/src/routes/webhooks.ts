import express from 'express';
import { ZodError } from 'zod';
import {
  SquareWebhookSchema,
  SquareWebhookPayload,
} from '../schemas/webhookSchema';
import { QueueService } from '../services/queueService';
// Remove the non-existent import - webhook verification is handled in securityService
import { webhookMetricsMiddleware } from '../middleware/metricsMiddleware';
import logger from '../services/logger';
import securityService from '../services/securityService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const router: any = express.Router();

/**
 * POST /square
 * Receives and processes Square webhook notifications
 * Webhook signature validation is handled in the securityService
 */
router.post(
  '/square',
  webhookMetricsMiddleware('square'),
  async (req: express.Request, res: express.Response) => {
    try {
      const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
      const requestUrl = `${req.protocol}://${req.get('host')}${
        req.originalUrl
      }`;
      const providedSignature = req.get('x-square-signature');

      logger.info(
        {
          headers: {
            'x-square-signature': providedSignature,
            'content-type': req.get('Content-Type'),
          },
          bodyLength: rawBody?.length,
        },
        'Received Square webhook'
      );

      // Validate Square webhook signature BEFORE further processing
      if (
        !rawBody ||
        !securityService.validateSquareSignature(
          rawBody,
          requestUrl,
          providedSignature
        )
      ) {
        logger.warn('Invalid Square webhook signature');
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid webhook signature',
        });
        return;
      }

      // Validate the webhook payload using Zod schema
      const validatedPayload: SquareWebhookPayload = SquareWebhookSchema.parse(
        req.body
      );

      logger.info(
        {
          eventType: validatedPayload.type,
          orderId: validatedPayload.data.id,
          merchantId: validatedPayload.merchant_id,
        },
        'Webhook validation passed'
      );

      // Initialize queue service and add job for background processing
      const queueService = new QueueService();

      try {
        // Add the webhook payload to the processing queue
        const jobId = await queueService.addOrderJob(validatedPayload);

        logger.info({ jobId }, 'Order processing job queued');

        // Return 202 Accepted as per OpenAPI spec
        res.status(202).json({
          status: 'accepted',
          message: 'Webhook received and queued for processing',
          jobId,
          orderId: validatedPayload.data.id,
        });
      } catch (queueError) {
        logger.error(
          { err: queueError },
          'Failed to queue order processing job'
        );

        // Return 500 if we can't queue the job
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to queue order for processing',
          code: 'QUEUE_ERROR',
        });
        return;
      }
    } catch (error) {
      logger.error({ err: error }, 'Webhook processing error');

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
  }
);

export default router;
