// Jest setup file for global test configuration
import nock from 'nock';

// Mock environment variables for tests
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] =
  'postgresql://test:test@localhost:5432/test_db?schema=public';
process.env['PORT'] = '3001';

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
