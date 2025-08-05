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
import { SecurityService } from '../services/securityService';
import { webhookDeduplicationService } from '../services/webhookDeduplicationService';
import { webhookAccessLogMiddleware } from '../middleware/accessLogMiddleware';

const securityService = new SecurityService();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const router: any = express.Router();

/**
 * POST /square
 * Receives and processes Square webhook notifications
 * Webhook signature validation is handled in the securityService
 */
router.post(
  '/square',
  webhookAccessLogMiddleware,
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
          code: 'INVALID_SIGNATURE',
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
          eventId: validatedPayload.event_id,
        },
        'Webhook validation passed'
      );

      // Process webhook with deduplication
      const result = await webhookDeduplicationService.handleWithDeduplication(
        validatedPayload.event_id,
        validatedPayload.type,
        async () => {
          // Initialize queue service and add job for background processing
          const queueService = new QueueService();

          // Add the webhook payload to the processing queue
          const jobId = await queueService.addOrderJob(validatedPayload);

          logger.info(
            { jobId, eventId: validatedPayload.event_id },
            'Order processing job queued'
          );

          return {
            jobId,
            orderId: validatedPayload.data.id,
            eventId: validatedPayload.event_id,
          };
        }
      );

      if (result === null) {
        // Duplicate webhook - return 200 OK but indicate it was already processed
        res.status(200).json({
          status: 'duplicate',
          message: 'Webhook event already processed',
          eventId: validatedPayload.event_id,
          orderId: validatedPayload.data.id,
        });
        return;
      }

      // Return 202 Accepted as per OpenAPI spec
      res.status(202).json({
        status: 'accepted',
        message: 'Webhook received and queued for processing',
        jobId: result.jobId,
        orderId: result.orderId,
        eventId: result.eventId,
      });
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
