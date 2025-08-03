import { MappingEngine } from '../mappingEngine';
import { DefaultMappingStrategy } from '../defaultMappingStrategy';
import { SquareOrder, MappingStrategy } from '../mapping.interfaces';

describe('MappingEngine', () => {
  let mappingEngine: MappingEngine;

  beforeEach(() => {
    mappingEngine = new MappingEngine();
  });

  describe('initialization', () => {
    it('should initialize with default strategy', () => {
      expect(mappingEngine.hasStrategy('default')).toBe(true);
      expect(mappingEngine.getStrategyNames()).toContain('default');
    });

    it('should return stats about registered strategies', () => {
      const stats = mappingEngine.getStats();
      expect(stats.totalStrategies).toBe(1);
      expect(stats.registeredStrategies).toContain('default');
      expect(stats.defaultStrategy).toBe('default');
    });
  });

  describe('strategy management', () => {
    it('should register new strategies', () => {
      const mockStrategy: MappingStrategy = {
        name: 'test-strategy',
        description: 'Test strategy for unit tests',
        transform: jest.fn(),
        canHandle: jest.fn().mockResolvedValue(true),
        getConfigurationSchema: jest.fn().mockReturnValue({}),
      };

      mappingEngine.register(mockStrategy);
      expect(mappingEngine.hasStrategy('test-strategy')).toBe(true);
      expect(mappingEngine.getStrategyNames()).toContain('test-strategy');
    });

    it('should get strategy by name', () => {
      const strategy = mappingEngine.getStrategy('default');
      expect(strategy).toBeInstanceOf(DefaultMappingStrategy);
      expect(strategy.name).toBe('default');
    });

    it('should fallback to default strategy for unknown strategy', () => {
      const strategy = mappingEngine.getStrategy('unknown-strategy');
      expect(strategy).toBeInstanceOf(DefaultMappingStrategy);
      expect(strategy.name).toBe('default');
    });

    it('should get strategy info', () => {
      const info = mappingEngine.getStrategyInfo('default');
      expect(info).toMatchObject({
        name: 'default',
        description: expect.stringContaining('Default Square to QuickBooks'),
        configurationSchema: expect.any(Object),
      });
    });

    it('should get all strategy info', () => {
      const allInfo = mappingEngine.getAllStrategyInfo();
      expect(allInfo).toHaveLength(1);
      expect(allInfo[0]?.name).toBe('default');
    });
  });

  describe('transformation', () => {
    const mockSquareOrder: SquareOrder = {
      id: 'test-order-123',
      location_id: 'test-location',
      state: 'COMPLETED',
      created_at: '2023-10-18T10:00:00.000Z',
      updated_at: '2023-10-18T10:00:00.000Z',
      total_money: {
        amount: 1500, // $15.00
        currency: 'USD',
      },
      line_items: [
        {
          uid: 'item-1',
          name: 'Test Item',
          quantity: '2',
          base_price_money: {
            amount: 750, // $7.50 each
            currency: 'USD',
          },
          total_money: {
            amount: 1500, // $15.00 total
            currency: 'USD',
          },
        },
      ],
    };

    it('should transform Square order using default strategy', async () => {
      const result = await mappingEngine.transform(mockSquareOrder);

      expect(result).toMatchObject({
        CustomerRef: {
          value: '1',
          name: expect.stringContaining('Square Customer'),
        },
        Line: expect.arrayContaining([
          expect.objectContaining({
            Amount: 15.0,
            DetailType: 'SalesItemLineDetail',
            SalesItemLineDetail: expect.objectContaining({
              ItemRef: {
                value: '1',
                name: 'Test Item',
              },
              UnitPrice: 7.5,
              Qty: 2,
            }),
          }),
        ]),
        TotalAmt: 15.0,
        PaymentRefNum: 'SQ-test-order-123',
        PaymentMethodRef: {
          value: '1',
          name: 'Credit Card',
        },
      });
    });

    it('should transform with custom mapping context', async () => {
      const context = {
        strategyName: 'default',
        options: {
          defaultCustomerId: '42',
          defaultPaymentMethodId: '5',
        },
        metadata: {
          merchantId: 'test-merchant',
          locationId: 'test-location',
          timestamp: '2023-10-18T10:00:00.000Z',
        },
      };

      const result = await mappingEngine.transform(mockSquareOrder, context);

      expect(result.CustomerRef.value).toBe('42');
      expect(result.PaymentMethodRef?.value).toBe('5');
    });
  });

  describe('validation', () => {
    const mockSquareOrder: SquareOrder = {
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

    it('should validate order can be processed', async () => {
      const validation = await mappingEngine.validateOrder(mockSquareOrder);

      expect(validation).toMatchObject({
        valid: true,
        strategy: 'default',
        errors: [],
      });
    });

    it('should handle validation errors for invalid orders', async () => {
      const invalidOrder = { ...mockSquareOrder, id: '' } as SquareOrder;
      const validation = await mappingEngine.validateOrder(invalidOrder);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should unregister non-default strategies', () => {
      const mockStrategy: MappingStrategy = {
        name: 'temp-strategy',
        description: 'Temporary strategy',
        transform: jest.fn(),
        canHandle: jest.fn(),
        getConfigurationSchema: jest.fn(),
      };

      mappingEngine.register(mockStrategy);
      expect(mappingEngine.hasStrategy('temp-strategy')).toBe(true);

      const removed = mappingEngine.unregister('temp-strategy');
      expect(removed).toBe(true);
      expect(mappingEngine.hasStrategy('temp-strategy')).toBe(false);
    });

    it('should not allow unregistering default strategy', () => {
      const removed = mappingEngine.unregister('default');
      expect(removed).toBe(false);
      expect(mappingEngine.hasStrategy('default')).toBe(true);
    });

    it('should clear non-default strategies', () => {
      const mockStrategy: MappingStrategy = {
        name: 'temp-strategy',
        description: 'Temporary strategy',
        transform: jest.fn(),
        canHandle: jest.fn(),
        getConfigurationSchema: jest.fn(),
      };

      mappingEngine.register(mockStrategy);
      expect(mappingEngine.getStrategyNames()).toHaveLength(2);

      mappingEngine.clearNonDefaultStrategies();
      expect(mappingEngine.getStrategyNames()).toHaveLength(1);
      expect(mappingEngine.hasStrategy('default')).toBe(true);
      expect(mappingEngine.hasStrategy('temp-strategy')).toBe(false);
    });
  });
});
