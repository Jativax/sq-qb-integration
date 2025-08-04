import { z } from 'zod';
import logger from '../services/logger';

/**
 * Centralized Configuration Service
 *
 * This module loads, validates, and exports all environment variables
 * as a single, typed configuration object using Zod validation.
 *
 * Benefits:
 * - Type safety for all environment variables
 * - Validation at startup (fail fast)
 * - Single source of truth for configuration
 * - Better developer experience with IntelliSense
 */

// Define the configuration schema with Zod
const configSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3001),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Redis Configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().min(0).default(0),

  // Square API Configuration
  SQUARE_WEBHOOK_SIGNATURE_KEY: z
    .string()
    .min(1, 'SQUARE_WEBHOOK_SIGNATURE_KEY is required'),
  SQUARE_ACCESS_TOKEN: z.string().default('test-square-token'),
  SQUARE_APPLICATION_ID: z.string().default('test-app-id'),
  SQUARE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),

  // QuickBooks API Configuration
  QB_ACCESS_TOKEN: z.string().default('test-qb-token'),
  QB_REALM_ID: z.string().default('test-realm-123'),
  QB_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),

  // Worker Configuration
  WORKER_CONCURRENCY: z.coerce.number().min(1).max(50).default(5),

  // Security
  PASSWORD_PEPPER: z.string().min(16, 'PASSWORD_PEPPER is required and must be at least 16 characters'),

  // Testing Configuration (optional)
  FORCE_QB_FAILURE: z.string().optional(),
});

// Export the configuration type for use throughout the application
export type Config = z.infer<typeof configSchema>;

/**
 * Load and validate configuration from environment variables
 */
function loadConfig(): Config {
  try {
    // Parse and validate environment variables
    const config = configSchema.parse(process.env);

    logger.info(
      {
        nodeEnv: config.NODE_ENV,
        port: config.PORT,
        redisHost: config.REDIS_HOST,
        redisPort: config.REDIS_PORT,
        squareEnv: config.SQUARE_ENVIRONMENT,
        qbEnv: config.QB_ENVIRONMENT,
        workerConcurrency: config.WORKER_CONCURRENCY,
      },
      'Configuration loaded and validated successfully'
    );

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error(
        {
          validationErrors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        },
        'Configuration validation failed'
      );

      // Log specific missing or invalid environment variables
      const missingVars = error.errors
        .filter(err => err.code === 'invalid_type' || err.code === 'too_small')
        .map(err => err.path.join('.'));

      if (missingVars.length > 0) {
        logger.error({ missingVars }, 'Missing required environment variables');
      }

      throw new Error(`Configuration validation failed: ${error.message}`);
    }

    logger.error({ err: error }, 'Unexpected error loading configuration');
    throw error;
  }
}

/**
 * Validate required environment variables for different environments
 */
function validateEnvironmentSpecificConfig(config: Config): void {
  // Production-specific validations
  if (config.NODE_ENV === 'production') {
    const productionRequiredVars = [
      'SQUARE_ACCESS_TOKEN',
      'SQUARE_APPLICATION_ID',
      'QB_ACCESS_TOKEN',
      'QB_REALM_ID',
    ];

    const missingProdVars = productionRequiredVars.filter(varName => {
      const value = config[varName as keyof Config];
      return !value || (typeof value === 'string' && value.startsWith('test-'));
    });

    if (missingProdVars.length > 0) {
      logger.error(
        { missingProdVars },
        'Production requires real API credentials, not test values'
      );
      throw new Error(
        `Production environment missing real credentials: ${missingProdVars.join(
          ', '
        )}`
      );
    }
  }

  // Development-specific warnings
  if (config.NODE_ENV === 'development') {
    if (
      config.SQUARE_ENVIRONMENT === 'production' ||
      config.QB_ENVIRONMENT === 'production'
    ) {
      logger.warn(
        '⚠️  Development environment using production API endpoints - proceed with caution!'
      );
    }
  }
}

// Load and validate configuration immediately
const config = loadConfig();
validateEnvironmentSpecificConfig(config);

// Export the validated configuration object
export default config;

// Named exports for convenience
export const {
  NODE_ENV,
  PORT,
  DATABASE_URL,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  REDIS_DB,
  SQUARE_WEBHOOK_SIGNATURE_KEY,
  SQUARE_ACCESS_TOKEN,
  SQUARE_APPLICATION_ID,
  SQUARE_ENVIRONMENT,
  QB_ACCESS_TOKEN,
  QB_REALM_ID,
  QB_ENVIRONMENT,
  WORKER_CONCURRENCY,
  FORCE_QB_FAILURE,
} = config;
