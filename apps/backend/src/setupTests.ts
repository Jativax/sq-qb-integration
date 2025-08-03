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
