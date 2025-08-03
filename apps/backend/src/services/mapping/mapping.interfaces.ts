import { QBSalesReceiptData } from '../quickBooksClient';

/**
 * Enhanced Square Order interface with detailed line items and modifiers
 * Extends the basic SquareOrder from squareClient.ts with additional transformation-specific fields
 */
export interface SquareOrder {
  id: string;
  location_id: string;
  order_id?: string;
  customer_id?: string;
  state: 'OPEN' | 'COMPLETED' | 'CANCELED';
  version?: number;
  created_at: string;
  updated_at: string;
  total_money?: {
    amount: number;
    currency: string;
  };
  line_items?: SquareLineItem[];
  tenders?: SquareTender[];
  taxes?: SquareTax[];
  discounts?: SquareDiscount[];
  service_charges?: SquareServiceCharge[];
}

/**
 * Square Line Item with comprehensive details including modifiers
 */
export interface SquareLineItem {
  uid?: string;
  catalog_object_id?: string;
  catalog_version?: string;
  name?: string;
  quantity: string;
  note?: string;
  base_price_money?: {
    amount: number;
    currency: string;
  };
  total_money?: {
    amount: number;
    currency: string;
  };
  gross_sales_money?: {
    amount: number;
    currency: string;
  };
  total_tax_money?: {
    amount: number;
    currency: string;
  };
  total_discount_money?: {
    amount: number;
    currency: string;
  };
  modifiers?: SquareOrderLineItemModifier[];
  applied_taxes?: SquareOrderLineItemAppliedTax[];
  applied_discounts?: SquareOrderLineItemAppliedDiscount[];
  applied_service_charges?: SquareOrderLineItemAppliedServiceCharge[];
}

/**
 * Square Line Item Modifier (add-ons, customizations)
 */
export interface SquareOrderLineItemModifier {
  uid?: string;
  catalog_object_id?: string;
  catalog_version?: string;
  name?: string;
  base_price_money?: {
    amount: number;
    currency: string;
  };
  total_price_money?: {
    amount: number;
    currency: string;
  };
}

/**
 * Applied tax to a line item
 */
export interface SquareOrderLineItemAppliedTax {
  uid?: string;
  tax_uid: string;
  applied_money?: {
    amount: number;
    currency: string;
  };
}

/**
 * Applied discount to a line item
 */
export interface SquareOrderLineItemAppliedDiscount {
  uid?: string;
  discount_uid: string;
  applied_money?: {
    amount: number;
    currency: string;
  };
}

/**
 * Applied service charge to a line item
 */
export interface SquareOrderLineItemAppliedServiceCharge {
  uid?: string;
  service_charge_uid: string;
  applied_money?: {
    amount: number;
    currency: string;
  };
}

/**
 * Square Tender (payment information)
 */
export interface SquareTender {
  id?: string;
  location_id?: string;
  transaction_id?: string;
  created_at?: string;
  note?: string;
  amount_money?: {
    amount: number;
    currency: string;
  };
  type:
    | 'CARD'
    | 'CASH'
    | 'THIRD_PARTY_CARD'
    | 'SQUARE_GIFT_CARD'
    | 'NO_SALE'
    | 'OTHER';
  card_details?: {
    status?: string;
    card?: {
      card_brand?: string;
      last_4?: string;
      exp_month?: number;
      exp_year?: number;
    };
    entry_method?: string;
  };
}

/**
 * Square Tax details
 */
export interface SquareTax {
  uid?: string;
  catalog_object_id?: string;
  catalog_version?: string;
  name?: string;
  type?: 'ADDITIVE' | 'INCLUSIVE';
  percentage?: string;
  applied_money?: {
    amount: number;
    currency: string;
  };
}

/**
 * Square Discount details
 */
export interface SquareDiscount {
  uid?: string;
  catalog_object_id?: string;
  catalog_version?: string;
  name?: string;
  type?:
    | 'FIXED_PERCENTAGE'
    | 'FIXED_AMOUNT'
    | 'VARIABLE_PERCENTAGE'
    | 'VARIABLE_AMOUNT';
  percentage?: string;
  amount_money?: {
    amount: number;
    currency: string;
  };
  applied_money?: {
    amount: number;
    currency: string;
  };
}

/**
 * Square Service Charge details
 */
export interface SquareServiceCharge {
  uid?: string;
  catalog_object_id?: string;
  catalog_version?: string;
  name?: string;
  type?: 'AUTO_GRATUITY' | 'CUSTOM';
  percentage?: string;
  amount_money?: {
    amount: number;
    currency: string;
  };
  applied_money?: {
    amount: number;
    currency: string;
  };
  taxable?: boolean;
}

/**
 * Mapping Context provides additional information for transformation decisions
 */
export interface MappingContext {
  /** The strategy name to use for this transformation */
  strategyName?: string;
  /** Additional configuration options for the mapping */
  options?: {
    /** Default customer ID for QuickBooks */
    defaultCustomerId?: string;
    /** Default payment method for QuickBooks */
    defaultPaymentMethodId?: string;
    /** Whether to include taxes as separate line items */
    includeTaxAsLineItems?: boolean;
    /** Whether to include discounts as separate line items (deprecated - discounts are now always included) */
    includeDiscountsAsLineItems?: boolean;
    /** Whether to include service charges as separate line items */
    includeServiceChargesAsLineItems?: boolean;
    /** Custom item mapping overrides */
    itemMapping?: Record<string, { id: string; name: string }>;
    /** Custom tax mapping */
    taxMapping?: Record<string, { id: string; name: string }>;
    /** Custom service charge mapping for tips and surcharges */
    serviceChargeMapping?: {
      tipItemId?: string;
      tipItemName?: string;
      surchargeItemId?: string;
      surchargeItemName?: string;
    };
  };
  /** Metadata about the transformation for logging/debugging */
  metadata?: {
    merchantId?: string;
    locationId?: string;
    timestamp?: string;
  };
}

/**
 * Core strategy interface for transforming Square orders to QuickBooks sales receipts
 */
export interface MappingStrategy {
  /**
   * Unique identifier for this mapping strategy
   */
  readonly name: string;

  /**
   * Human-readable description of this mapping strategy
   */
  readonly description: string;

  /**
   * Transform a Square order into QuickBooks sales receipt data
   * @param order The Square order to transform
   * @param context Optional context for transformation decisions
   * @returns Promise that resolves to QuickBooks sales receipt data
   */
  transform(
    order: SquareOrder,
    context?: MappingContext
  ): Promise<QBSalesReceiptData>;

  /**
   * Validate that the strategy can handle the given order
   * @param order The Square order to validate
   * @param context Optional context for validation
   * @returns Promise that resolves to true if the order can be processed
   */
  canHandle(order: SquareOrder, context?: MappingContext): Promise<boolean>;

  /**
   * Get configuration schema for this strategy (for UI/API configuration)
   * @returns JSON schema describing the configuration options
   */
  getConfigurationSchema(): object;
}

/**
 * Registry interface for managing multiple mapping strategies
 */
export interface MappingStrategyRegistry {
  /**
   * Register a new mapping strategy
   * @param strategy The strategy to register
   */
  register(strategy: MappingStrategy): void;

  /**
   * Get a strategy by name
   * @param name The strategy name
   * @returns The strategy or undefined if not found
   */
  getStrategy(name: string): MappingStrategy | undefined;

  /**
   * Get all registered strategy names
   * @returns Array of strategy names
   */
  getStrategyNames(): string[];

  /**
   * Check if a strategy is registered
   * @param name The strategy name
   * @returns True if the strategy is registered
   */
  hasStrategy(name: string): boolean;
}

/**
 * Error thrown when a mapping transformation fails
 */
export class MappingError extends Error {
  public readonly strategyName: string;
  public readonly orderId: string;
  public override readonly cause?: Error | undefined;

  constructor(
    message: string,
    strategyName: string,
    orderId: string,
    cause?: Error
  ) {
    super(message);
    this.name = 'MappingError';
    this.strategyName = strategyName;
    this.orderId = orderId;
    if (cause) {
      this.cause = cause;
    }
  }
}

/**
 * Error thrown when a requested mapping strategy is not found
 */
export class StrategyNotFoundError extends Error {
  constructor(
    public readonly strategyName: string,
    public readonly availableStrategies: string[]
  ) {
    super(
      `Mapping strategy '${strategyName}' not found. Available strategies: ${availableStrategies.join(
        ', '
      )}`
    );
    this.name = 'StrategyNotFoundError';
  }
}
