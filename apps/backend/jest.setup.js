/**
 * Jest setup file - runs before each test suite
 * Ensures consistent test environment configuration
 */

// Force disable webhook deduplication in all test environments
process.env.WEBHOOK_DEDUP_DISABLED = 'true';

// Ensure test environment
process.env.NODE_ENV = 'test';

// Optional: Set other test-specific environment variables
process.env.LOG_LEVEL = 'silent'; // Reduce test noise
