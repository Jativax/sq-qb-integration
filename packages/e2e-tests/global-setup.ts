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
  console.log(`   - Frontend Health: ${frontendUrl}/health`);

  try {
    // Check if we're in CI environment
    const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';

    console.log(`Environment: ${isCI ? 'CI' : 'Local'}`);
    console.log(`   - Backend Health: ${backendUrl}/health`);
    console.log(`   - Frontend: ${frontendUrl}/`); // Check root instead of /health

    await waitOn({
      resources: [
        'http-get://localhost:3001/health',
        'http-get://localhost:5173/', // Check root instead of /health for frontend
      ],
      timeout: 180000, // 3 minutes for CI cold starts
      interval: 3000, // Check every 3 seconds
      validateStatus: status => status >= 200 && status < 400,
      window: 5000, // Wait for 5 seconds of consecutive success
      verbose: true, // Enable detailed logging
      headers: {
        Accept: 'text/html,application/json',
        'User-Agent': 'Playwright-E2E-Tests',
      },
    });
    console.log('✅ All services are ready!');
  } catch (err) {
    console.error('❌ Services did not become ready in time:', err);

    // Enhanced diagnostic commands
    console.log('--- Checking service accessibility ---');
    try {
      console.log('Backend health check:');
      execSync('curl -v http://localhost:3001/health || true', {
        stdio: 'inherit',
      });
      console.log('Backend ready check:');
      execSync('curl -v http://localhost:3001/ready || true', {
        stdio: 'inherit',
      });
      console.log('Frontend root check:');
      execSync('curl -v http://localhost:5173/ || true', { stdio: 'inherit' });
      console.log('Frontend health check:');
      execSync('curl -v http://localhost:5173/health || true', {
        stdio: 'inherit',
      });

      console.log('--- Docker container status ---');
      execSync(
        'docker ps --filter name=sq-qb- --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"',
        { stdio: 'inherit' }
      );
    } catch (e) {
      console.log('Diagnostic commands failed:', e.message);
    }

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
