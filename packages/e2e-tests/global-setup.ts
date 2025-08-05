// packages/e2e-tests/global-setup.ts
import { execSync } from 'child_process';
import waitOn from 'wait-on';

async function globalSetup() {
  console.log('🚀 Starting E2E test global setup...');

  // 1. Define service URLs
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  console.log(`⏳ Waiting for services to be ready...`);
  console.log(`   - Backend: ${backendUrl}`);
  console.log(`   - Frontend: ${frontendUrl}`);

  // 2. Use wait-on to poll for service health
  try {
    await waitOn({
      resources: [
        `${backendUrl}/`, // Backend health check endpoint
        frontendUrl, // Frontend server
      ],
      timeout: 120000, // 2-minute timeout
      interval: 2000, // Check every 2 seconds
      validateStatus: status => status >= 200 && status < 300, // health check should return 2xx
    });
    console.log('✅ All services are ready!');
  } catch (err) {
    console.error('❌ Services did not become ready in time:', err);
    // On failure, print the backend logs for immediate diagnosis
    console.error('--- Last 100 lines of backend logs ---');
    execSync('docker logs sq-qb-backend --tail 100', { stdio: 'inherit' });
    throw new Error('Service readiness check failed.');
  }

  // 3. Clear test data before running tests
  console.log('🧹 Clearing test data...');
  try {
    const response = await fetch(`${backendUrl}/api/test/clear`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to clear test data: ${response.statusText}`);
    }
    console.log('✅ Test data cleared successfully.');
  } catch (err) {
    console.error('❌ Failed to clear test data:', err);
    throw new Error('Test data clearing failed.');
  }
}

export default globalSetup;
