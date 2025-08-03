// Export all mapping interfaces and types
export * from './mapping.interfaces';

// Export mapping strategies
export { DefaultMappingStrategy } from './defaultMappingStrategy';

// Export the main mapping engine
export { MappingEngine } from './mappingEngine';

// Re-export commonly used types for convenience
export type {
  MappingStrategy,
  MappingContext,
  SquareOrder,
  MappingStrategyRegistry,
} from './mapping.interfaces';
