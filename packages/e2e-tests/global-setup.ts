// packages/e2e-tests/global-setup.ts
import { execSync } from 'child_process';
import waitOn from 'wait-on';

async function globalSetup() {
  console.log('🚀 Starting E2E test global setup...');

  const backendUrl = (
    process.env.BACKEND_URL || 'http://localhost:3001'
  ).replace(/\/$/, '');
  const frontendUrl = (
    process.env.FRONTEND_URL || 'http://localhost:5173'
  ).replace(/\/$/, '');

  console.log(`⏳ Waiting for services to be ready...`);
  console.log(`   - Backend Health: ${backendUrl}/health`);
  console.log(`   - Frontend: ${frontendUrl}`);

  try {
    await waitOn({
      resources: [`${backendUrl}/health`, frontendUrl],
      timeout: 120000,
      interval: 2000,
      validateStatus: status => status >= 200 && status < 300,
    });
    console.log('✅ All services are ready!');
  } catch (err) {
    console.error('❌ Services did not become ready in time:', err);
    console.error('--- Last 100 lines of backend logs ---');
    execSync('docker logs sq-qb-backend --tail 100', { stdio: 'inherit' });
    console.error('--- Last 100 lines of frontend logs ---');
    execSync('docker logs sq-qb-frontend --tail 100', { stdio: 'inherit' });
    throw new Error('Service readiness check failed.');
  }

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
