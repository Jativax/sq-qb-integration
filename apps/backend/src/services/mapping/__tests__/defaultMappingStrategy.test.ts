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
  });
});
