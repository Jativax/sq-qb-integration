import { z } from 'zod';
import fs from 'fs';
import path from 'path';

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
  HOST: z.string().default('localhost'),
  PORT: z.coerce.number().min(1).max(65535).default(3001),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Redis Configuration - supports both REDIS_URL and individual components
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().min(0).default(0),

  // Square API Configuration
  SQUARE_WEBHOOK_SIGNATURE_KEY: z
    .string()
    .min(1, 'SQUARE_WEBHOOK_SIGNATURE_KEY is required'),
  SQUARE_WEBHOOK_URL: z
    .string()
    .url()
    .optional()
    .default('http://localhost:3001/api/v1/webhooks/square'),
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
  PASSWORD_PEPPER: z
    .string()
    .min(16, 'PASSWORD_PEPPER is required and must be at least 16 characters'),

  // CORS Configuration
  CORS_ORIGIN: z.string().optional(),
  CORS_CREDENTIALS: z.coerce.boolean().default(false),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100), // per window
  WEBHOOK_RATE_LIMIT_MAX: z.coerce.number().default(300), // per window for webhooks

  // Access Logging
  ACCESS_LOG_SAMPLING_RATE: z.coerce.number().min(0).max(1).default(1), // 1 = log all, 0.1 = log 10%
  ACCESS_LOG_INCLUDE_BODY: z.coerce.boolean().default(false), // Include request/response bodies

  // Testing Configuration (optional)
  FORCE_QB_FAILURE: z.string().optional(),
});

// Health check endpoints constants
export const HEALTH_PATH = '/health';
export const METRICS_PATH = '/metrics';

// Export the configuration type for use throughout the application
export type Config = z.infer<typeof configSchema>;

/**
 * Read Docker secret from file system
 * @param secretName - Name of the secret file to read
 * @returns Secret value as string, or undefined if file doesn't exist
 */
function readDockerSecret(secretName: string): string | undefined {
  try {
    const secretPath = path.join('/run/secrets', secretName);
    if (fs.existsSync(secretPath)) {
      return fs.readFileSync(secretPath, 'utf8').trim();
    }
    return undefined;
  } catch (error) {
    console.warn(`Failed to read Docker secret ${secretName}:`, error);
    return undefined;
  }
}

/**
 * Build DATABASE_URL from secrets and environment variables in production
 */
function buildDatabaseUrl(): string {
  const isProduction = process.env['NODE_ENV'] === 'production';

  if (isProduction) {
    // In production, build DATABASE_URL from components and secrets
    const dbUser = process.env['POSTGRES_USER'] ?? 'squser';
    const dbName = process.env['POSTGRES_DB'] ?? 'sq_qb_integration';
    const dbPassword =
      readDockerSecret('postgres_password') ?? process.env['POSTGRES_PASSWORD'];
    const dbHost = process.env['PGBOUNCER_HOST'] ?? 'pgbouncer';
    const dbPort = process.env['PGBOUNCER_PORT'] ?? '6432';

    if (!dbPassword) {
      throw new Error('Database password not found in secrets or environment');
    }

    return `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?pgbouncer=true`;
  } else {
    // In development, use provided DATABASE_URL or construct from env vars
    return (
      process.env['DATABASE_URL'] ??
      `postgresql://${process.env['POSTGRES_USER'] ?? 'sq_qb_user'}:${
        process.env['POSTGRES_PASSWORD'] ?? 'your_secure_password'
      }@localhost:6432/${
        process.env['POSTGRES_DB'] ?? 'sq_qb_integration'
      }?schema=public`
    );
  }
}

/**
 * Build REDIS_URL from environment variables if not provided
 */
function buildRedisUrl(): string | undefined {
  // Prefer REDIS_URL if provided
  if (process.env['REDIS_URL']) {
    return process.env['REDIS_URL'];
  }

  // Otherwise construct from components
  const redisHost = process.env['REDIS_HOST'] ?? 'localhost';
  const redisPort = process.env['REDIS_PORT'] ?? '6379';
  const redisPassword = process.env['REDIS_PASSWORD'];
  const redisDb = process.env['REDIS_DB'] ?? '0';

  let redisUrl = `redis://`;
  if (redisPassword) {
    redisUrl += `:${redisPassword}@`;
  }
  redisUrl += `${redisHost}:${redisPort}/${redisDb}`;

  return redisUrl;
}

/**
 * Load configuration values from Docker secrets (production) or environment variables (development)
 * @returns Configuration object with all values populated
 */
function loadConfigurationValues(): Record<string, string | undefined> {
  const isProduction = process.env['NODE_ENV'] === 'production';

  if (isProduction) {
    console.info('Loading configuration from Docker secrets (production mode)');

    // In production, read sensitive values from Docker secrets
    return {
      // Keep non-sensitive values from environment
      NODE_ENV: process.env['NODE_ENV'],
      HOST: process.env['HOST'],
      PORT: process.env['PORT'],
      SQUARE_ENVIRONMENT: process.env['SQUARE_ENVIRONMENT'],
      QB_ENVIRONMENT: process.env['QB_ENVIRONMENT'],
      WORKER_CONCURRENCY: process.env['WORKER_CONCURRENCY'],
      FORCE_QB_FAILURE: process.env['FORCE_QB_FAILURE'],

      // Build URLs dynamically
      DATABASE_URL: buildDatabaseUrl(),
      REDIS_URL: buildRedisUrl(),
      REDIS_HOST: process.env['REDIS_HOST'],
      REDIS_PORT: process.env['REDIS_PORT'],
      REDIS_PASSWORD: process.env['REDIS_PASSWORD'],
      REDIS_DB: process.env['REDIS_DB'],

      // Read sensitive values from Docker secrets
      SQUARE_WEBHOOK_SIGNATURE_KEY: readDockerSecret(
        'square_webhook_signature_key'
      ),
      SQUARE_ACCESS_TOKEN: readDockerSecret('square_access_token'),
      SQUARE_APPLICATION_ID: readDockerSecret('square_application_id'),
      QB_ACCESS_TOKEN: readDockerSecret('qb_access_token'),
      QB_REALM_ID: readDockerSecret('qb_realm_id'),
      PASSWORD_PEPPER: readDockerSecret('password_pepper'),
    };
  } else {
    console.info(
      'Loading configuration from environment variables (development mode)'
    );
    // In development, build URLs if needed and use environment variables
    const configValues = process.env as Record<string, string | undefined>;

    // Ensure DATABASE_URL is built if not provided
    if (!configValues['DATABASE_URL']) {
      configValues['DATABASE_URL'] = buildDatabaseUrl();
    }

    // Build REDIS_URL if not provided but individual components are
    if (!configValues['REDIS_URL']) {
      configValues['REDIS_URL'] = buildRedisUrl();
    }

    return configValues;
  }
}

/**
 * Load and validate configuration from environment variables or Docker secrets
 */
function loadConfig(): Config {
  try {
    // Load configuration values (from secrets in production, env vars in development)
    const configValues = loadConfigurationValues();

    // Parse and validate configuration values
    const config = configSchema.parse(configValues);

    console.info('Configuration loaded and validated successfully:', {
      nodeEnv: config.NODE_ENV,
      port: config.PORT,
      redisHost: config.REDIS_HOST,
      redisPort: config.REDIS_PORT,
      squareEnv: config.SQUARE_ENVIRONMENT,
      qbEnv: config.QB_ENVIRONMENT,
      workerConcurrency: config.WORKER_CONCURRENCY,
    });

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:', {
        validationErrors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      });

      // Log specific missing or invalid environment variables
      const missingVars = error.errors
        .filter(err => err.code === 'invalid_type' || err.code === 'too_small')
        .map(err => err.path.join('.'));

      if (missingVars.length > 0) {
        console.error('Missing required environment variables:', {
          missingVars,
        });
      }

      throw new Error(`Configuration validation failed: ${error.message}`);
    }

    console.error('Unexpected error loading configuration:', error);
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
      console.error(
        'Production requires real API credentials, not test values:',
        { missingProdVars }
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
      console.warn(
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
  HOST,
  PORT,
  DATABASE_URL,
  REDIS_URL,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  REDIS_DB,
  SQUARE_WEBHOOK_SIGNATURE_KEY,
  SQUARE_WEBHOOK_URL,
  SQUARE_ACCESS_TOKEN,
  SQUARE_APPLICATION_ID,
  SQUARE_ENVIRONMENT,
  QB_ACCESS_TOKEN,
  QB_REALM_ID,
  QB_ENVIRONMENT,
  WORKER_CONCURRENCY,
  PASSWORD_PEPPER,
  CORS_ORIGIN,
  CORS_CREDENTIALS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  WEBHOOK_RATE_LIMIT_MAX,
  ACCESS_LOG_SAMPLING_RATE,
  ACCESS_LOG_INCLUDE_BODY,
  FORCE_QB_FAILURE,
} = config;
