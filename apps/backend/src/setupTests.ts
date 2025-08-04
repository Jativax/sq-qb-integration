// Jest setup file for global test configuration
import nock from 'nock';

// Mock the database service for all tests
jest.mock('./services/db', () => ({
  getPrismaClient: jest.fn(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $on: jest.fn(),
    squareOrder: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    quickBooksReceipt: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    syncJob: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  })),
  disconnectPrisma: jest.fn().mockResolvedValue(undefined),
  db: jest.fn(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $on: jest.fn(),
    squareOrder: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    quickBooksReceipt: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    syncJob: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  })),
}));

// Mock environment variables for tests
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] =
  'postgresql://test:test@localhost:5432/test_db?schema=public';
process.env['PORT'] = '3001';
process.env['SQUARE_WEBHOOK_SIGNATURE_KEY'] = 'test-signature-key';
process.env['SQUARE_ACCESS_TOKEN'] = 'test-square-token';
process.env['SQUARE_APPLICATION_ID'] = 'test-app-id';
process.env['SQUARE_ENVIRONMENT'] = 'sandbox';
process.env['QB_ACCESS_TOKEN'] = 'test-qb-token';
process.env['QB_REALM_ID'] = 'test-realm-123';
process.env['QB_ENVIRONMENT'] = 'sandbox';
process.env['PASSWORD_PEPPER'] = 'test-pepper-1234567890';
process.env['REDIS_HOST'] = 'localhost';
process.env['REDIS_PORT'] = '6379';
process.env['REDIS_DB'] = '0';
process.env['WORKER_CONCURRENCY'] = '5';

// Global test timeout
jest.setTimeout(10000);

// Configure nock for testing
beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

// Clean up any open handles after each test
afterEach(() => {
  jest.clearAllMocks();
  nock.cleanAll();
});
