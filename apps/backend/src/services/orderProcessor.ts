import { PrismaClient } from '@prisma/client';
import { SquareApiClient } from './squareClient';
import { QuickBooksClient } from './quickBooksClient';
import { SquareWebhookPayload } from '../schemas/webhookSchema';
import { MappingEngine, SquareOrder, MappingContext } from './mapping';

export class OrderProcessor {
  constructor(
    private prismaClient: PrismaClient,
    private squareApiClient: SquareApiClient,
    private quickBooksClient: QuickBooksClient,
    private mappingEngine: MappingEngine
  ) {}

  async processOrder(webhookPayload: SquareWebhookPayload): Promise<void> {
    const orderId = webhookPayload.data.object.order.id;
    console.log(`🔄 Starting order processing for: ${orderId}`);

    let squareOrderRecord;
    try {
      // Step 1: Extract order ID from webhook payload
      // (Already done by Zod validation and passed as argument)

      // Step 2: Create initial SquareOrder record with PENDING status
      console.log('💾 Creating initial SquareOrder record...');
      squareOrderRecord = await this.prismaClient.squareOrder.create({
        data: {
          squareOrderId: orderId,
          status: 'PENDING',
          payload: webhookPayload as never, // Store the full webhook payload
        },
      });
      console.log('✅ SquareOrder record created:', squareOrderRecord.id);

      // Step 3: Fetch full order details from Square API
      console.log('🔍 Fetching order details from Square API...');
      const squareOrderData = await this.squareApiClient.getOrderById(orderId);
      console.log('✅ Square order fetched successfully');

      // Step 4: Transform Square order data to QuickBooks format using MappingEngine
      console.log(
        '🔄 Transforming data for QuickBooks using mapping engine...'
      );
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
      console.log('📝 Creating sales receipt in QuickBooks...');
      const qbReceipt = await this.quickBooksClient.createSalesReceipt(
        qbReceiptData
      );
      console.log('✅ QuickBooks receipt created:', qbReceipt.Id);

      // Step 6: Create QuickBooksReceipt record and link to SquareOrder
      console.log('💾 Creating QuickBooksReceipt record...');
      await this.prismaClient.quickBooksReceipt.create({
        data: {
          qbReceiptId: qbReceipt.Id!,
          syncStatus: 'SYNCED',
          totalAmount: qbReceipt.TotalAmt,
          rawQBData: qbReceipt as never, // Store the full QB response
          squareOrderId: squareOrderRecord.id,
        },
      });
      console.log('✅ QuickBooksReceipt record created');

      // Step 7: Update SquareOrder status to COMPLETED
      await this.prismaClient.squareOrder.update({
        where: { id: squareOrderRecord.id },
        data: { status: 'COMPLETED' },
      });
      console.log('✅ SquareOrder status updated to COMPLETED');

      console.log('🎉 Order processing completed successfully!');
    } catch (error) {
      console.error('❌ Error processing order:', error);

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
            console.log('⚠️ SquareOrder status updated to FAILED');
          }
        } catch (updateError) {
          console.error('❌ Failed to update order status:', updateError);
        }
      }

      // Re-throw the error for upstream handling
      throw error;
    }
  }
}
