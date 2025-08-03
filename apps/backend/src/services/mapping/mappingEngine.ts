import {
  MappingStrategy,
  MappingStrategyRegistry,
  MappingContext,
  SquareOrder,
  StrategyNotFoundError,
  MappingError,
} from './mapping.interfaces';
import { QBSalesReceiptData } from '../quickBooksClient';
import { DefaultMappingStrategy } from './defaultMappingStrategy';
import { metricsService } from '../metricsService';

/**
 * Main mapping engine that orchestrates different mapping strategies
 * Provides a unified interface for transforming Square orders to QuickBooks format
 */
export class MappingEngine implements MappingStrategyRegistry {
  private readonly strategies = new Map<string, MappingStrategy>();
  private readonly defaultStrategyName = 'default';

  constructor() {
    // Register the default strategy
    this.register(new DefaultMappingStrategy());
    console.log('🔧 MappingEngine initialized with default strategy');
  }

  /**
   * Register a new mapping strategy
   * @param strategy The strategy to register
   */
  register(strategy: MappingStrategy): void {
    if (this.strategies.has(strategy.name)) {
      console.warn(`⚠️ Overriding existing mapping strategy: ${strategy.name}`);
    }

    this.strategies.set(strategy.name, strategy);
    console.log(
      `✅ Registered mapping strategy: ${strategy.name} - ${strategy.description}`
    );
  }

  /**
   * Get a strategy by name, with fallback to default strategy
   * @param name The strategy name (optional, defaults to 'default')
   * @returns The requested strategy
   * @throws StrategyNotFoundError if strategy not found and no default available
   */
  getStrategy(name?: string): MappingStrategy {
    const strategyName = name || this.defaultStrategyName;
    const strategy = this.strategies.get(strategyName);

    if (strategy) {
      return strategy;
    }

    // Try to fallback to default strategy if requested strategy not found
    if (strategyName !== this.defaultStrategyName) {
      console.warn(
        `⚠️ Strategy '${strategyName}' not found, falling back to default strategy`
      );
      const defaultStrategy = this.strategies.get(this.defaultStrategyName);
      if (defaultStrategy) {
        return defaultStrategy;
      }
    }

    // No strategy found and no default available
    throw new StrategyNotFoundError(strategyName, this.getStrategyNames());
  }

  /**
   * Get all registered strategy names
   * @returns Array of strategy names
   */
  getStrategyNames(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Check if a strategy is registered
   * @param name The strategy name
   * @returns True if the strategy is registered
   */
  hasStrategy(name: string): boolean {
    return this.strategies.has(name);
  }

  /**
   * Transform a Square order using the specified or default strategy
   * @param order The Square order to transform
   * @param context Optional mapping context including strategy selection
   * @returns Promise resolving to QuickBooks sales receipt data
   * @throws StrategyNotFoundError if requested strategy doesn't exist
   * @throws MappingError if transformation fails
   */
  async transform(
    order: SquareOrder,
    context?: MappingContext
  ): Promise<QBSalesReceiptData> {
    const strategyName = context?.strategyName;
    const strategy = this.getStrategy(strategyName);

    console.log(
      `🔄 Using mapping strategy '${strategy.name}' for order ${order.id}`
    );

    // Validate that the strategy can handle this order
    const canHandle = await strategy.canHandle(order, context);
    if (!canHandle) {
      throw new MappingError(
        `Strategy '${strategy.name}' cannot handle order ${order.id}`,
        strategy.name,
        order.id
      );
    }

    // Perform the transformation
    try {
      const result = await strategy.transform(order, context);

      // Record successful strategy usage
      metricsService.recordMappingStrategyUsed(strategy.name, true);

      console.log(
        `✅ Successfully transformed order ${order.id} using strategy '${strategy.name}'`
      );
      return result;
    } catch (error) {
      // Record failed strategy usage
      metricsService.recordMappingStrategyUsed(strategy.name, false);

      // Re-throw MappingError as-is, wrap other errors
      if (error instanceof MappingError) {
        throw error;
      }

      throw new MappingError(
        `Transformation failed using strategy '${strategy.name}' for order ${order.id}`,
        strategy.name,
        order.id,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Validate that an order can be processed by a specific strategy
   * @param order The Square order to validate
   * @param strategyName Optional strategy name (defaults to 'default')
   * @param context Optional mapping context
   * @returns Promise resolving to validation result
   */
  async validateOrder(
    order: SquareOrder,
    strategyName?: string,
    context?: MappingContext
  ): Promise<{ valid: boolean; strategy: string; errors: string[] }> {
    const errors: string[] = [];

    try {
      const strategy = this.getStrategy(strategyName);
      const canHandle = await strategy.canHandle(order, context);

      return {
        valid: canHandle,
        strategy: strategy.name,
        errors: canHandle
          ? []
          : [`Strategy '${strategy.name}' cannot handle this order`],
      };
    } catch (error) {
      if (error instanceof StrategyNotFoundError) {
        errors.push(error.message);
      } else {
        errors.push(
          `Validation error: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      return {
        valid: false,
        strategy: strategyName || this.defaultStrategyName,
        errors,
      };
    }
  }

  /**
   * Get detailed information about a specific strategy
   * @param name The strategy name
   * @returns Strategy information or null if not found
   */
  getStrategyInfo(name: string): {
    name: string;
    description: string;
    configurationSchema: object;
  } | null {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      return null;
    }

    return {
      name: strategy.name,
      description: strategy.description,
      configurationSchema: strategy.getConfigurationSchema(),
    };
  }

  /**
   * Get information about all registered strategies
   * @returns Array of strategy information
   */
  getAllStrategyInfo(): Array<{
    name: string;
    description: string;
    configurationSchema: object;
  }> {
    return Array.from(this.strategies.values()).map(strategy => ({
      name: strategy.name,
      description: strategy.description,
      configurationSchema: strategy.getConfigurationSchema(),
    }));
  }

  /**
   * Remove a strategy from the registry
   * @param name The strategy name to remove
   * @returns True if strategy was removed, false if it didn't exist
   */
  unregister(name: string): boolean {
    if (name === this.defaultStrategyName) {
      console.warn(`⚠️ Cannot unregister default strategy: ${name}`);
      return false;
    }

    const existed = this.strategies.has(name);
    if (existed) {
      this.strategies.delete(name);
      console.log(`✅ Unregistered mapping strategy: ${name}`);
    }

    return existed;
  }

  /**
   * Get statistics about the mapping engine
   * @returns Engine statistics
   */
  getStats(): {
    totalStrategies: number;
    registeredStrategies: string[];
    defaultStrategy: string;
  } {
    return {
      totalStrategies: this.strategies.size,
      registeredStrategies: this.getStrategyNames(),
      defaultStrategy: this.defaultStrategyName,
    };
  }

  /**
   * Clear all strategies except the default one
   * Useful for testing or dynamic reconfiguration
   */
  clearNonDefaultStrategies(): void {
    const defaultStrategy = this.strategies.get(this.defaultStrategyName);
    this.strategies.clear();

    if (defaultStrategy) {
      this.strategies.set(this.defaultStrategyName, defaultStrategy);
    }

    console.log('🧹 Cleared all non-default mapping strategies');
  }
}
