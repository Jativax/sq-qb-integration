import { FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...');

  // Clean up test data after all tests
  await clearTestData();

  console.log('✅ E2E test global teardown completed');
}

async function clearTestData() {
  console.log('🧹 Final cleanup of test data...');

  try {
    const response = await fetch('http://127.0.0.1:3001/api/test/clear', {
      method: 'POST',
    });

    if (response.ok) {
      console.log('✅ Final test data cleanup completed');
    }
  } catch (error) {
    console.warn('⚠️ Failed to perform final cleanup:', error);
  }
}

export default globalTeardown;
