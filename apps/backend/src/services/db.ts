import { PrismaClient } from '@prisma/client';
import logger from './logger';
import config from '../config';

/**
 * Global singleton instance of PrismaClient for optimal connection management.
 * This prevents multiple database connections in development and improves performance.
 */

// Extend globalThis to include our prisma instance for development hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

/**
 * Gets or creates the singleton PrismaClient instance.
 * Uses globalThis in development to prevent new connections during hot-reloads.
 *
 * @returns The shared PrismaClient instance
 */
export function getPrismaClient(): PrismaClient {
  // In development, use globalThis to persist the instance across hot-reloads
  if (config.NODE_ENV === 'development') {
    if (!globalThis.__prisma) {
      globalThis.__prisma = new PrismaClient({
        log: ['warn', 'error'],
      });

      logger.info(
        'PrismaClient singleton created (development mode with globalThis)'
      );
    }
    prisma = globalThis.__prisma;
  } else {
    // In production, create a single instance without globalThis
    if (!prisma) {
      prisma = new PrismaClient({
        log: ['warn', 'error'],
      });

      logger.info('PrismaClient singleton created (production mode)');
    }
  }

  return prisma;
}

/**
 * Gracefully disconnects the PrismaClient instance.
 * Should be called during application shutdown.
 */
export async function disconnectPrisma(): Promise<void> {
  const client = prisma || globalThis.__prisma;
  if (client) {
    await client.$disconnect();
    logger.info('PrismaClient disconnected');
  }
}

// Export the singleton instance for direct usage
export const db = getPrismaClient();

// Default export for convenience
export default db;
