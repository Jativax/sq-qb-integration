import { PrismaClient } from '@prisma/client';
import { SquareApiClient } from './squareClient';
import { QuickBooksClient, QBSalesReceiptData } from './quickBooksClient';
import { SquareWebhookPayload } from '../schemas/webhookSchema';

export class OrderProcessor {
  constructor(
    private prismaClient: PrismaClient,
    private squareApiClient: SquareApiClient,
    private quickBooksClient: QuickBooksClient
  ) {}

  async processOrder(webhookPayload: SquareWebhookPayload): Promise<void> {
    console.log('🔄 Starting order processing for:', webhookPayload.data.id);

    try {
      // Step 1: Extract order ID from webhook payload
      const orderId = webhookPayload.data.id;

      // Step 2: Create initial SquareOrder record with PENDING status
      console.log('💾 Creating initial SquareOrder record...');
      const squareOrderRecord = await this.prismaClient.squareOrder.create({
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

      // Step 4: Transform Square order data to QuickBooks format
      console.log('🔄 Transforming data for QuickBooks...');
      const qbReceiptData = this.transformSquareToQB(squareOrderData);

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
      try {
        const existingRecord = await this.prismaClient.squareOrder.findUnique({
          where: { squareOrderId: webhookPayload.data.id },
        });

        if (existingRecord) {
          await this.prismaClient.squareOrder.update({
            where: { id: existingRecord.id },
            data: { status: 'FAILED' },
          });
          console.log('📝 Updated SquareOrder status to FAILED');
        }
      } catch (updateError) {
        console.error('❌ Failed to update order status:', updateError);
      }

      // Re-throw the error for upstream handling
      throw error;
    }
  }

  /**
   * Transform Square order data to QuickBooks sales receipt format
   */
  private transformSquareToQB(squareOrder: unknown): QBSalesReceiptData {
    // Calculate total amount in dollars (Square uses cents)
    const squareOrderData = squareOrder as Record<string, unknown>;
    const totalMoney = squareOrderData['total_money'] as
      | { amount?: number }
      | undefined;
    const totalAmountCents = totalMoney?.amount || 0;
    const totalAmountDollars = totalAmountCents / 100;

    // Create line items from Square order
    const lineItems = (
      squareOrderData['line_items'] as unknown[] | undefined
    )?.map((item: unknown) => {
      const itemData = item as Record<string, unknown>;
      const itemTotalMoney = itemData['total_money'] as
        | { amount?: number }
        | undefined;
      const itemBaseMoney = itemData['base_price_money'] as
        | { amount?: number }
        | undefined;
      const itemAmountCents =
        itemTotalMoney?.amount || itemBaseMoney?.amount || 0;
      const itemAmountDollars = itemAmountCents / 100;

      return {
        Amount: itemAmountDollars,
        DetailType: 'SalesItemLineDetail' as const,
        SalesItemLineDetail: {
          ItemRef: {
            value: '1', // Default service item - would need mapping in real implementation
            name: (itemData['name'] as string) || 'Service',
          },
          UnitPrice: itemAmountDollars,
          Qty: parseFloat((itemData['quantity'] as string) || '1'),
        },
      };
    }) || [
      {
        // Fallback line item if no line items in Square order
        Amount: totalAmountDollars,
        DetailType: 'SalesItemLineDetail' as const,
        SalesItemLineDetail: {
          ItemRef: {
            value: '1',
            name: 'Service',
          },
          UnitPrice: totalAmountDollars,
          Qty: 1,
        },
      },
    ];

    return {
      CustomerRef: {
        value: '1', // Default customer - would need mapping in real implementation
        name: 'Square Customer',
      },
      Line: lineItems,
      TotalAmt: totalAmountDollars,
      PaymentRefNum: `SQ-${(squareOrderData['id'] as string) || 'unknown'}`, // Use Square order ID as reference
      PaymentMethodRef: {
        value: '1', // Default payment method
        name: 'Credit Card',
      },
    };
  }
}
