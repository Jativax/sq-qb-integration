import { FullConfig } from '@playwright/test';

/* eslint-disable @typescript-eslint/no-unused-vars */
async function globalSetup(_config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');

  // Wait for backend to be ready
  await waitForBackend();

  // Clear test data
  await clearTestData();

  console.log('✅ E2E test global setup completed');
}

async function waitForBackend(maxRetries = 30, delay = 2000) {
  console.log('⏳ Waiting for backend to be ready...');

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:3001/');
      if (response.ok) {
        console.log('✅ Backend is ready');
        return;
      }
    } catch (error) {
      // Backend not ready, wait and retry
    }

    console.log(`⏳ Backend not ready, retrying... (${i + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('❌ Backend failed to start within timeout period');
}

async function clearTestData() {
  console.log('🧹 Clearing test data...');

  try {
    // Clear Redis queue and database through test endpoint
    const response = await fetch('http://localhost:3001/api/test/clear', {
      method: 'POST',
    });

    if (!response.ok) {
      console.warn(
        '⚠️ Test clear endpoint not available - manual cleanup may be needed'
      );
    } else {
      console.log('✅ Test data cleared successfully');
    }
  } catch (error) {
    console.warn('⚠️ Failed to clear test data:', error);
  }
}

export default globalSetup;
