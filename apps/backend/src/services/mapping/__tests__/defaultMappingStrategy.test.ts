import { DefaultMappingStrategy } from '../defaultMappingStrategy';
import { SquareOrder, MappingContext } from '../mapping.interfaces';

describe('DefaultMappingStrategy', () => {
  let strategy: DefaultMappingStrategy;

  beforeEach(() => {
    strategy = new DefaultMappingStrategy();
  });

  describe('basic properties', () => {
    it('should have correct name and description', () => {
      expect(strategy.name).toBe('default');
      expect(strategy.description).toContain('Default Square to QuickBooks');
    });

    it('should provide configuration schema', () => {
      const schema = strategy.getConfigurationSchema();
      expect(schema).toHaveProperty('type', 'object');
      expect(schema).toHaveProperty('properties');
    });
  });

  describe('canHandle validation', () => {
    it('should handle valid orders', async () => {
      const validOrder: SquareOrder = {
        id: 'test-order-123',
        location_id: 'test-location',
        state: 'COMPLETED',
        created_at: '2023-10-18T10:00:00.000Z',
        updated_at: '2023-10-18T10:00:00.000Z',
        total_money: {
          amount: 1500,
          currency: 'USD',
        },
      };

      const canHandle = await strategy.canHandle(validOrder);
      expect(canHandle).toBe(true);
    });

    it('should reject orders without ID', async () => {
      const invalidOrder = {
        location_id: 'test-location',
        state: 'COMPLETED',
        created_at: '2023-10-18T10:00:00.000Z',
        updated_at: '2023-10-18T10:00:00.000Z',
      } as SquareOrder;

      const canHandle = await strategy.canHandle(invalidOrder);
      expect(canHandle).toBe(false);
    });

    it('should reject orders without total money or line items', async () => {
      const invalidOrder: SquareOrder = {
        id: 'test-order-123',
        location_id: 'test-location',
        state: 'COMPLETED',
        created_at: '2023-10-18T10:00:00.000Z',
        updated_at: '2023-10-18T10:00:00.000Z',
        // No total_money and no line_items
      };

      const canHandle = await strategy.canHandle(invalidOrder);
      expect(canHandle).toBe(false);
    });
  });

  describe('transformation', () => {
    it('should transform basic order with total money', async () => {
      const order: SquareOrder = {
        id: 'test-order-123',
        location_id: 'test-location',
        state: 'COMPLETED',
        created_at: '2023-10-18T10:00:00.000Z',
        updated_at: '2023-10-18T10:00:00.000Z',
        total_money: {
          amount: 2500, // $25.00
          currency: 'USD',
        },
      };

      const result = await strategy.transform(order);

      expect(result).toMatchObject({
        CustomerRef: {
          value: '1',
          name: expect.stringContaining('Square Customer'),
        },
        Line: [
          {
            Amount: 25.0,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: {
              ItemRef: {
                value: '1',
                name: 'Service',
              },
              UnitPrice: 25.0,
              Qty: 1,
            },
          },
        ],
        TotalAmt: 25.0,
        PaymentRefNum: 'SQ-test-order-123',
        PaymentMethodRef: {
          value: '1',
          name: 'Credit Card',
        },
      });
    });

    it('should transform order with line items', async () => {
      const order: SquareOrder = {
        id: 'test-order-456',
        location_id: 'test-location',
        state: 'COMPLETED',
        created_at: '2023-10-18T10:00:00.000Z',
        updated_at: '2023-10-18T10:00:00.000Z',
        total_money: {
          amount: 3000, // $30.00
          currency: 'USD',
        },
        line_items: [
          {
            uid: 'item-1',
            name: 'Coffee',
            quantity: '2',
            base_price_money: {
              amount: 500, // $5.00 each
              currency: 'USD',
            },
            total_money: {
              amount: 1000, // $10.00 total
              currency: 'USD',
            },
          },
          {
            uid: 'item-2',
            name: 'Pastry',
            quantity: '1',
            base_price_money: {
              amount: 2000, // $20.00
              currency: 'USD',
            },
            total_money: {
              amount: 2000, // $20.00 total
              currency: 'USD',
            },
          },
        ],
      };

      const result = await strategy.transform(order);

      expect(result.Line).toHaveLength(2);
      expect(result.Line[0]).toMatchObject({
        Amount: 10.0,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: {
            value: '1',
            name: 'Coffee',
          },
          UnitPrice: 5.0,
          Qty: 2,
        },
      });
      expect(result.Line[1]).toMatchObject({
        Amount: 20.0,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: {
            value: '1',
            name: 'Pastry',
          },
          UnitPrice: 20.0,
          Qty: 1,
        },
      });
    });

    it('should transform with custom mapping context', async () => {
      const order: SquareOrder = {
        id: 'test-order-789',
        location_id: 'test-location',
        state: 'COMPLETED',
        created_at: '2023-10-18T10:00:00.000Z',
        updated_at: '2023-10-18T10:00:00.000Z',
        total_money: {
          amount: 1500,
          currency: 'USD',
        },
      };

      const context: MappingContext = {
        options: {
          defaultCustomerId: '42',
          defaultPaymentMethodId: '7',
        },
      };

      const result = await strategy.transform(order, context);

      expect(result.CustomerRef.value).toBe('42');
      expect(result.PaymentMethodRef?.value).toBe('7');
    });

    it('should handle orders with modifiers', async () => {
      const order: SquareOrder = {
        id: 'test-order-with-modifiers',
        location_id: 'test-location',
        state: 'COMPLETED',
        created_at: '2023-10-18T10:00:00.000Z',
        updated_at: '2023-10-18T10:00:00.000Z',
        total_money: {
          amount: 1300, // $13.00
          currency: 'USD',
        },
        line_items: [
          {
            uid: 'item-1',
            name: 'Coffee',
            quantity: '1',
            base_price_money: {
              amount: 1000, // $10.00
              currency: 'USD',
            },
            total_money: {
              amount: 1000,
              currency: 'USD',
            },
            modifiers: [
              {
                uid: 'mod-1',
                name: 'Extra Shot',
                base_price_money: {
                  amount: 300, // $3.00
                  currency: 'USD',
                },
                total_price_money: {
                  amount: 300,
                  currency: 'USD',
                },
              },
            ],
          },
        ],
      };

      const result = await strategy.transform(order);

      expect(result.Line).toHaveLength(2); // Main item + modifier
      expect(result.Line[1]).toMatchObject({
        Amount: 3.0,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: {
            value: '1',
            name: 'Coffee - Extra Shot',
          },
          UnitPrice: 3.0,
          Qty: 1,
        },
      });
    });

    it('should handle orders with tenders for payment method detection', async () => {
      const order: SquareOrder = {
        id: 'test-order-cash',
        location_id: 'test-location',
        state: 'COMPLETED',
        created_at: '2023-10-18T10:00:00.000Z',
        updated_at: '2023-10-18T10:00:00.000Z',
        total_money: {
          amount: 500,
          currency: 'USD',
        },
        tenders: [
          {
            type: 'CASH',
            amount_money: {
              amount: 500,
              currency: 'USD',
            },
          },
        ],
      };

      const result = await strategy.transform(order);

      expect(result.PaymentMethodRef?.name).toBe('Cash');
    });

    it('should transform order with customer_id', async () => {
      const order: SquareOrder = {
        id: 'test-order-customer',
        location_id: 'test-location',
        customer_id: 'customer-123',
        state: 'COMPLETED',
        created_at: '2023-10-18T10:00:00.000Z',
        updated_at: '2023-10-18T10:00:00.000Z',
        total_money: {
          amount: 1000,
          currency: 'USD',
        },
      };

      const result = await strategy.transform(order);

      expect(result.CustomerRef).toMatchObject({
        value: 'customer-123',
        name: 'Square Customer customer-123',
      });
    });

    it('should transform order with discounts', async () => {
      const order: SquareOrder = {
        id: 'test-order-discounts',
        location_id: 'test-location',
        state: 'COMPLETED',
        created_at: '2023-10-18T10:00:00.000Z',
        updated_at: '2023-10-18T10:00:00.000Z',
        total_money: {
          amount: 1800, // $18.00 (original $20 - $2 discount)
          currency: 'USD',
        },
        line_items: [
          {
            uid: 'item-1',
            name: 'Coffee',
            quantity: '1',
            base_price_money: {
              amount: 2000, // $20.00
              currency: 'USD',
            },
            total_money: {
              amount: 2000,
              currency: 'USD',
            },
          },
        ],
        discounts: [
          {
            uid: 'discount-1',
            name: '10% Off',
            type: 'FIXED_PERCENTAGE',
            percentage: '10',
            applied_money: {
              amount: 200, // $2.00 discount
              currency: 'USD',
            },
          },
        ],
      };

      const result = await strategy.transform(order);

      expect(result.Line).toHaveLength(2); // Item + discount
      expect(result.Line[1]).toMatchObject({
        Amount: -2.0, // Negative for discount
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: {
            value: '1',
            name: 'Discount - 10% Off',
          },
          UnitPrice: -2.0,
          Qty: 1,
        },
      });
    });

    it('should transform order with service charges (tips)', async () => {
      const order: SquareOrder = {
        id: 'test-order-tips',
        location_id: 'test-location',
        state: 'COMPLETED',
        created_at: '2023-10-18T10:00:00.000Z',
        updated_at: '2023-10-18T10:00:00.000Z',
        total_money: {
          amount: 2300, // $23.00 ($20 + $3 tip)
          currency: 'USD',
        },
        line_items: [
          {
            uid: 'item-1',
            name: 'Coffee',
            quantity: '1',
            base_price_money: {
              amount: 2000, // $20.00
              currency: 'USD',
            },
            total_money: {
              amount: 2000,
              currency: 'USD',
            },
          },
        ],
        service_charges: [
          {
            uid: 'tip-1',
            name: 'Tip',
            type: 'AUTO_GRATUITY',
            percentage: '15',
            applied_money: {
              amount: 300, // $3.00 tip
              currency: 'USD',
            },
            taxable: false,
          },
        ],
      };

      const result = await strategy.transform(order);

      expect(result.Line).toHaveLength(2); // Item + tip
      expect(result.Line[1]).toMatchObject({
        Amount: 3.0, // Positive for service charge
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: {
            value: '1',
            name: 'Tip',
          },
          UnitPrice: 3.0,
          Qty: 1,
        },
      });
    });

    it('should transform order with custom surcharge', async () => {
      const order: SquareOrder = {
        id: 'test-order-surcharge',
        location_id: 'test-location',
        state: 'COMPLETED',
        created_at: '2023-10-18T10:00:00.000Z',
        updated_at: '2023-10-18T10:00:00.000Z',
        total_money: {
          amount: 2150, // $21.50 ($20 + $1.50 delivery fee)
          currency: 'USD',
        },
        line_items: [
          {
            uid: 'item-1',
            name: 'Coffee',
            quantity: '1',
            base_price_money: {
              amount: 2000, // $20.00
              currency: 'USD',
            },
            total_money: {
              amount: 2000,
              currency: 'USD',
            },
          },
        ],
        service_charges: [
          {
            uid: 'delivery-1',
            name: 'Delivery Fee',
            type: 'CUSTOM',
            applied_money: {
              amount: 150, // $1.50 delivery fee
              currency: 'USD',
            },
            taxable: true,
          },
        ],
      };

      const result = await strategy.transform(order);

      expect(result.Line).toHaveLength(2); // Item + delivery fee
      expect(result.Line[1]).toMatchObject({
        Amount: 1.5, // Positive for service charge
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: {
            value: '1',
            name: 'Service Charge - Delivery Fee',
          },
          UnitPrice: 1.5,
          Qty: 1,
        },
      });
    });

    it('should transform complex order with customer, discounts, and service charges', async () => {
      const order: SquareOrder = {
        id: 'test-order-complex',
        location_id: 'test-location',
        customer_id: 'customer-456',
        state: 'COMPLETED',
        created_at: '2023-10-18T10:00:00.000Z',
        updated_at: '2023-10-18T10:00:00.000Z',
        total_money: {
          amount: 2530, // $25.30 total after all adjustments
          currency: 'USD',
        },
        line_items: [
          {
            uid: 'item-1',
            name: 'Premium Coffee',
            quantity: '2',
            base_price_money: {
              amount: 1200, // $12.00 each
              currency: 'USD',
            },
            total_money: {
              amount: 2400, // $24.00 total
              currency: 'USD',
            },
          },
        ],
        discounts: [
          {
            uid: 'discount-1',
            name: 'Loyalty Discount',
            type: 'FIXED_AMOUNT',
            applied_money: {
              amount: 200, // $2.00 discount
              currency: 'USD',
            },
          },
        ],
        service_charges: [
          {
            uid: 'tip-1',
            name: 'Auto Gratuity',
            type: 'AUTO_GRATUITY',
            percentage: '18',
            applied_money: {
              amount: 330, // $3.30 tip
              currency: 'USD',
            },
            taxable: false,
          },
        ],
      };

      const context: MappingContext = {
        options: {
          serviceChargeMapping: {
            tipItemId: 'tip-item-id',
            tipItemName: 'Gratuity',
          },
        },
      };

      const result = await strategy.transform(order, context);

      expect(result.CustomerRef).toMatchObject({
        value: 'customer-456',
        name: 'Square Customer customer-456',
      });

      expect(result.Line).toHaveLength(3); // Item + discount + tip

      // Check main item
      expect(result.Line[0]).toMatchObject({
        Amount: 24.0,
        SalesItemLineDetail: {
          ItemRef: {
            name: 'Premium Coffee',
          },
          UnitPrice: 12.0,
          Qty: 2,
        },
      });

      // Check discount (negative)
      expect(result.Line[1]).toMatchObject({
        Amount: -2.0,
        SalesItemLineDetail: {
          ItemRef: {
            name: 'Discount - Loyalty Discount',
          },
        },
      });

      // Check tip (positive, custom mapping)
      expect(result.Line[2]).toMatchObject({
        Amount: 3.3,
        SalesItemLineDetail: {
          ItemRef: {
            value: 'tip-item-id',
            name: 'Gratuity',
          },
        },
      });
    });

    it('should handle zero-amount discounts and service charges', async () => {
      const order: SquareOrder = {
        id: 'test-order-zero-amounts',
        location_id: 'test-location',
        state: 'COMPLETED',
        created_at: '2023-10-18T10:00:00.000Z',
        updated_at: '2023-10-18T10:00:00.000Z',
        total_money: {
          amount: 1000,
          currency: 'USD',
        },
        line_items: [
          {
            uid: 'item-1',
            name: 'Coffee',
            quantity: '1',
            total_money: {
              amount: 1000,
              currency: 'USD',
            },
          },
        ],
        discounts: [
          {
            uid: 'discount-1',
            name: 'Zero Discount',
            applied_money: {
              amount: 0, // Zero amount
              currency: 'USD',
            },
          },
        ],
        service_charges: [
          {
            uid: 'service-1',
            name: 'Zero Service Charge',
            applied_money: {
              amount: 0, // Zero amount
              currency: 'USD',
            },
          },
        ],
      };

      const result = await strategy.transform(order);

      // Should only have the main item, zero-amount items should be filtered out
      expect(result.Line).toHaveLength(1);
      expect(result.Line[0]?.SalesItemLineDetail?.ItemRef?.name).toBe('Coffee');
    });
  });
});
