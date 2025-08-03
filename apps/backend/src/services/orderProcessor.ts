import { SquareApiClient } from './squareClient';
import { QuickBooksClient } from './quickBooksClient';
import { SquareWebhookPayload } from '../schemas/webhookSchema';
import { MappingEngine, SquareOrder, MappingContext } from './mapping';
import logger from './logger';
import { getPrismaClient } from './db';

export class OrderProcessor {
  private prismaClient = getPrismaClient();

  constructor(
    private squareApiClient: SquareApiClient,
    private quickBooksClient: QuickBooksClient,
    private mappingEngine: MappingEngine
  ) {}

  async processOrder(webhookPayload: SquareWebhookPayload): Promise<void> {
    const orderId = webhookPayload.data.object.order.id;
    logger.info({ orderId }, 'Starting order processing');

    let squareOrderRecord;
    try {
      // Step 1: Extract order ID from webhook payload
      // (Already done by Zod validation and passed as argument)

      // Step 2: Create initial SquareOrder record with PENDING status
      logger.debug('Creating initial SquareOrder record...');
      squareOrderRecord = await this.prismaClient.squareOrder.create({
        data: {
          squareOrderId: orderId,
          status: 'PENDING',
          payload: webhookPayload as never, // Store the full webhook payload
        },
      });
      logger.info(
        { squareOrderRecordId: squareOrderRecord.id },
        'SquareOrder record created'
      );

      // Step 3: Fetch full order details from Square API
      logger.debug({ orderId }, 'Fetching order details from Square API...');
      const squareOrderData = await this.squareApiClient.getOrderById(orderId);
      logger.info({ orderId }, 'Square order fetched successfully');

      // Step 4: Transform Square order data to QuickBooks format using MappingEngine
      logger.debug('Transforming data for QuickBooks using mapping engine...');
      const mappingContext: MappingContext = {
        strategyName: 'default', // Use default strategy for now
        options: {
          defaultCustomerId: '1',
          defaultPaymentMethodId: '1',
        },
        metadata: {
          merchantId: webhookPayload.merchant_id,
          locationId: (squareOrderData as SquareOrder).location_id,
          timestamp: new Date().toISOString(),
        },
      };

      const qbReceiptData = await this.mappingEngine.transform(
        squareOrderData as SquareOrder,
        mappingContext
      );

      // Step 5: Create sales receipt in QuickBooks
      logger.debug('Creating sales receipt in QuickBooks...');
      const qbReceipt = await this.quickBooksClient.createSalesReceipt(
        qbReceiptData
      );
      logger.info({ qbReceiptId: qbReceipt.Id }, 'QuickBooks receipt created');

      // Step 6: Create QuickBooksReceipt record and link to SquareOrder
      logger.debug('Creating QuickBooksReceipt record...');
      await this.prismaClient.quickBooksReceipt.create({
        data: {
          qbReceiptId: qbReceipt.Id!,
          syncStatus: 'SYNCED',
          totalAmount: qbReceipt.TotalAmt,
          rawQBData: qbReceipt as never, // Store the full QB response
          squareOrderId: squareOrderRecord.id,
        },
      });
      logger.info(
        { qbReceiptId: qbReceipt.Id },
        'QuickBooksReceipt record created'
      );

      // Step 7: Update SquareOrder status to COMPLETED
      await this.prismaClient.squareOrder.update({
        where: { id: squareOrderRecord.id },
        data: { status: 'COMPLETED' },
      });
      logger.info(
        { squareOrderRecordId: squareOrderRecord.id },
        'SquareOrder status updated to COMPLETED'
      );

      logger.info({ orderId }, 'Order processing completed successfully!');
    } catch (error) {
      logger.error({ err: error, orderId }, 'Error processing order');

      // Try to update the order status to FAILED if we have a record
      if (squareOrderRecord) {
        try {
          const existingRecord = await this.prismaClient.squareOrder.findUnique(
            {
              where: { id: squareOrderRecord.id },
            }
          );
          if (existingRecord) {
            await this.prismaClient.squareOrder.update({
              where: { id: squareOrderRecord.id },
              data: { status: 'FAILED' },
            });
            logger.warn(
              { squareOrderRecordId: squareOrderRecord.id },
              'SquareOrder status updated to FAILED'
            );
          }
        } catch (updateError) {
          logger.error(
            { err: updateError, squareOrderRecordId: squareOrderRecord.id },
            'Failed to update order status'
          );
        }
      }

      // Re-throw the error for upstream handling
      throw error;
    }
  }
}
