import {
  MappingStrategy,
  MappingContext,
  SquareOrder,
  MappingError,
} from './mapping.interfaces';
import { QBSalesReceiptData } from '../quickBooksClient';
import logger from '../logger';

/**
 * Default mapping strategy that implements the basic Square-to-QuickBooks transformation
 * This strategy provides a straightforward mapping with sensible defaults
 */
export class DefaultMappingStrategy implements MappingStrategy {
  public readonly name = 'default';
  public readonly description =
    'Default Square to QuickBooks mapping with standard field transformations';

  /**
   * Transform Square order data to QuickBooks sales receipt format
   * @param order The Square order to transform
   * @param context Optional mapping context for customization
   * @returns Promise resolving to QuickBooks sales receipt data
   */
  async transform(
    order: SquareOrder,
    context?: MappingContext
  ): Promise<QBSalesReceiptData> {
    try {
      logger.info(
        { orderId: order.id, strategy: this.name },
        'Transforming Square order using strategy'
      );

      // Calculate total amount in dollars (Square uses cents)
      const totalAmountCents = order.total_money?.amount || 0;
      const totalAmountDollars = totalAmountCents / 100;

      // Transform line items
      const lineItems = this.transformLineItems(order, context);

      // Build the QuickBooks sales receipt data
      const salesReceiptData: QBSalesReceiptData = {
        CustomerRef: {
          value: this.getCustomerId(order, context),
          name: this.getCustomerName(order, context),
        },
        Line: lineItems,
        TotalAmt: totalAmountDollars,
        PaymentRefNum: this.generatePaymentReference(order),
        PaymentMethodRef: {
          value: context?.options?.defaultPaymentMethodId || '1',
          name: this.getPaymentMethodName(order, context),
        },
      };

      logger.info(
        { orderId: order.id },
        'Successfully transformed order to QuickBooks format'
      );
      return salesReceiptData;
    } catch (error) {
      const errorMessage = `Failed to transform Square order ${order.id}`;
      logger.error({ err: error, orderId: order.id }, errorMessage);
      throw new MappingError(
        errorMessage,
        this.name,
        order.id,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Validate that this strategy can handle the given order
   * @param order The Square order to validate
   * @param context Optional mapping context
   * @returns Promise resolving to true if the order can be processed
   */
  async canHandle(
    order: SquareOrder,
    context?: MappingContext
  ): Promise<boolean> {
    // Default strategy can handle any order with basic validation
    if (!order.id) {
      logger.warn('Order missing required ID field');
      return false;
    }

    if (
      !order.total_money &&
      (!order.line_items || order.line_items.length === 0)
    ) {
      logger.warn('Order has no total money and no line items');
      return false;
    }

    return true;
  }

  /**
   * Get configuration schema for this strategy
   * @returns JSON schema describing configuration options
   */
  getConfigurationSchema(): object {
    return {
      type: 'object',
      properties: {
        defaultCustomerId: {
          type: 'string',
          description: 'Default QuickBooks customer ID to use for all orders',
          default: '1',
        },
        defaultPaymentMethodId: {
          type: 'string',
          description: 'Default QuickBooks payment method ID',
          default: '1',
        },
        includeTaxAsLineItems: {
          type: 'boolean',
          description: 'Whether to include taxes as separate line items',
          default: false,
        },
        includeDiscountsAsLineItems: {
          type: 'boolean',
          description:
            'Whether to include discounts as separate line items (deprecated - discounts are now always included)',
          default: true,
        },
        includeServiceChargesAsLineItems: {
          type: 'boolean',
          description:
            'Whether to include service charges (tips/surcharges) as separate line items',
          default: true,
        },
        serviceChargeMapping: {
          type: 'object',
          description: 'Custom mapping for service charges',
          properties: {
            tipItemId: {
              type: 'string',
              description: 'QuickBooks item ID for tips',
              default: '1',
            },
            tipItemName: {
              type: 'string',
              description: 'QuickBooks item name for tips',
              default: 'Tip',
            },
            surchargeItemId: {
              type: 'string',
              description: 'QuickBooks item ID for surcharges',
              default: '1',
            },
            surchargeItemName: {
              type: 'string',
              description: 'QuickBooks item name for surcharges',
              default: 'Service Charge',
            },
          },
        },
        itemMapping: {
          type: 'object',
          description: 'Custom item mapping overrides',
          additionalProperties: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
            required: ['id', 'name'],
          },
        },
      },
    };
  }

  /**
   * Transform Square line items to QuickBooks line items
   * @private
   */
  private transformLineItems(order: SquareOrder, context?: MappingContext) {
    const lineItems = [];

    // Process regular line items
    if (order.line_items && order.line_items.length > 0) {
      for (const item of order.line_items) {
        const transformedItem = this.transformLineItem(item, context);
        if (transformedItem) {
          lineItems.push(transformedItem);
        }

        // Process modifiers as separate line items
        if (item.modifiers && item.modifiers.length > 0) {
          for (const modifier of item.modifiers) {
            const transformedModifier = this.transformModifier(
              modifier,
              item,
              context
            );
            if (transformedModifier) {
              lineItems.push(transformedModifier);
            }
          }
        }
      }
    }

    // Add tax line items if configured
    if (context?.options?.includeTaxAsLineItems && order.taxes) {
      for (const tax of order.taxes) {
        const transformedTax = this.transformTaxAsLineItem(tax, context);
        if (transformedTax) {
          lineItems.push(transformedTax);
        }
      }
    }

    // Always add discount line items (discounts should always be visible)
    if (order.discounts && order.discounts.length > 0) {
      for (const discount of order.discounts) {
        const transformedDiscount = this.transformDiscountAsLineItem(
          discount,
          context
        );
        if (transformedDiscount) {
          lineItems.push(transformedDiscount);
        }
      }
    }

    // Add service charge line items (tips and surcharges)
    if (order.service_charges && order.service_charges.length > 0) {
      for (const serviceCharge of order.service_charges) {
        const transformedServiceCharge = this.transformServiceChargeAsLineItem(
          serviceCharge,
          context
        );
        if (transformedServiceCharge) {
          lineItems.push(transformedServiceCharge);
        }
      }
    }

    // Fallback line item if no line items exist
    if (lineItems.length === 0) {
      const totalAmountCents = order.total_money?.amount || 0;
      const totalAmountDollars = totalAmountCents / 100;

      lineItems.push({
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
      });
    }

    return lineItems;
  }

  /**
   * Transform a single Square line item
   * @private
   */
  private transformLineItem(item: any, context?: MappingContext) {
    const itemTotalMoney = item.total_money;
    const itemBaseMoney = item.base_price_money;
    const itemAmountCents =
      itemTotalMoney?.amount || itemBaseMoney?.amount || 0;
    const itemAmountDollars = itemAmountCents / 100;

    const itemName = item.name || 'Service';
    const quantity = parseFloat(item.quantity || '1');

    // Check for custom item mapping
    const customMapping =
      context?.options?.itemMapping?.[item.catalog_object_id || itemName];

    return {
      Amount: itemAmountDollars,
      DetailType: 'SalesItemLineDetail' as const,
      SalesItemLineDetail: {
        ItemRef: {
          value: customMapping?.id || '1',
          name: customMapping?.name || itemName,
        },
        UnitPrice:
          quantity > 0 ? itemAmountDollars / quantity : itemAmountDollars,
        Qty: quantity,
      },
    };
  }

  /**
   * Transform a Square modifier into a QuickBooks line item
   * @private
   */
  private transformModifier(
    modifier: any,
    parentItem: any,
    _context?: MappingContext
  ) {
    const modifierAmountCents =
      modifier.total_price_money?.amount ||
      modifier.base_price_money?.amount ||
      0;
    const modifierAmountDollars = modifierAmountCents / 100;

    if (modifierAmountDollars === 0) {
      return null; // Skip zero-amount modifiers
    }

    const modifierName = modifier.name || 'Modifier';
    const parentItemName = parentItem.name || 'Service';

    return {
      Amount: modifierAmountDollars,
      DetailType: 'SalesItemLineDetail' as const,
      SalesItemLineDetail: {
        ItemRef: {
          value: '1', // Default service item
          name: `${parentItemName} - ${modifierName}`,
        },
        UnitPrice: modifierAmountDollars,
        Qty: 1,
      },
    };
  }

  /**
   * Transform a Square tax into a QuickBooks line item
   * @private
   */
  private transformTaxAsLineItem(tax: any, _context?: MappingContext) {
    const taxAmountCents = tax.applied_money?.amount || 0;
    const taxAmountDollars = taxAmountCents / 100;

    if (taxAmountDollars === 0) {
      return null;
    }

    return {
      Amount: taxAmountDollars,
      DetailType: 'SalesItemLineDetail' as const,
      SalesItemLineDetail: {
        ItemRef: {
          value: '1',
          name: `Tax - ${tax.name || 'Sales Tax'}`,
        },
        UnitPrice: taxAmountDollars,
        Qty: 1,
      },
    };
  }

  /**
   * Transform a Square discount into a QuickBooks line item
   * @private
   */
  private transformDiscountAsLineItem(
    discount: any,
    _context?: MappingContext
  ) {
    const discountAmountCents = discount.applied_money?.amount || 0;
    const discountAmountDollars = -(discountAmountCents / 100); // Negative for discount

    if (discountAmountDollars === 0) {
      return null;
    }

    return {
      Amount: discountAmountDollars,
      DetailType: 'SalesItemLineDetail' as const,
      SalesItemLineDetail: {
        ItemRef: {
          value: '1',
          name: `Discount - ${discount.name || 'Discount'}`,
        },
        UnitPrice: discountAmountDollars,
        Qty: 1,
      },
    };
  }

  /**
   * Transform a Square service charge into a QuickBooks line item
   * @private
   */
  private transformServiceChargeAsLineItem(
    serviceCharge: any,
    context?: MappingContext
  ) {
    const serviceChargeAmountCents = serviceCharge.applied_money?.amount || 0;
    const serviceChargeAmountDollars = serviceChargeAmountCents / 100; // Positive for service charge

    if (serviceChargeAmountDollars === 0) {
      return null;
    }

    // Determine if this is a tip or other surcharge
    const isTip = this.isServiceChargeTip(serviceCharge);
    const itemMapping = context?.options?.serviceChargeMapping;

    let itemId: string;
    let itemName: string;

    if (isTip) {
      itemId = itemMapping?.tipItemId || '1';
      itemName = itemMapping?.tipItemName || 'Tip';
    } else {
      itemId = itemMapping?.surchargeItemId || '1';
      itemName = itemMapping?.surchargeItemName || 'Service Charge';
    }

    // Add service charge name for better identification
    const serviceChargeName = serviceCharge.name || 'Service Charge';
    const fullName =
      serviceChargeName.toLowerCase().includes('tip') || isTip
        ? itemName
        : `${itemName} - ${serviceChargeName}`;

    return {
      Amount: serviceChargeAmountDollars,
      DetailType: 'SalesItemLineDetail' as const,
      SalesItemLineDetail: {
        ItemRef: {
          value: itemId,
          name: fullName,
        },
        UnitPrice: serviceChargeAmountDollars,
        Qty: 1,
      },
    };
  }

  /**
   * Determine if a service charge is a tip based on its properties
   * @private
   */
  private isServiceChargeTip(serviceCharge: any): boolean {
    // Check service charge type
    if (serviceCharge.type === 'AUTO_GRATUITY') {
      return true;
    }

    // Check service charge name for tip-related keywords
    const name = (serviceCharge.name || '').toLowerCase();
    const tipKeywords = ['tip', 'gratuity', 'service', 'auto-gratuity'];

    return tipKeywords.some(keyword => name.includes(keyword));
  }

  /**
   * Get customer ID for QuickBooks CustomerRef
   * @private
   */
  private getCustomerId(order: SquareOrder, context?: MappingContext): string {
    // Use Square customer ID if available, otherwise use default
    if (order.customer_id) {
      return order.customer_id;
    }
    return context?.options?.defaultCustomerId || '1';
  }

  /**
   * Generate customer name from Square order
   * @private
   */
  private getCustomerName(
    order: SquareOrder,
    _context?: MappingContext
  ): string {
    // If we have a customer_id, use it in the name for identification
    if (order.customer_id) {
      return `Square Customer ${order.customer_id}`;
    }
    // Fallback to location-based naming
    const locationId = order.location_id;
    return `Square Customer (${locationId})`;
  }

  /**
   * Generate payment method name based on order tenders
   * @private
   */
  private getPaymentMethodName(
    order: SquareOrder,
    _context?: MappingContext
  ): string {
    // Check if order has tender information
    if (order.tenders && order.tenders.length > 0) {
      const primaryTender = order.tenders[0];
      if (primaryTender) {
        switch (primaryTender.type) {
          case 'CARD':
          case 'THIRD_PARTY_CARD':
            return 'Credit Card';
          case 'CASH':
            return 'Cash';
          case 'SQUARE_GIFT_CARD':
            return 'Gift Card';
          default:
            return 'Other';
        }
      }
    }

    // Default payment method
    return 'Credit Card';
  }

  /**
   * Generate payment reference number
   * @private
   */
  private generatePaymentReference(order: SquareOrder): string {
    return `SQ-${order.id}`;
  }
}
