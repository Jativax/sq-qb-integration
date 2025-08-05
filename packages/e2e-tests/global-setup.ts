// packages/e2e-tests/global-setup.ts
import { execSync } from 'child_process';
import waitOn from 'wait-on';

async function globalSetup() {
  console.log('🚀 Starting E2E test global setup...');

  console.log(`⏳ Waiting for services to be ready...`);

  // Check if we're in CI environment
  const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';
  console.log(`Environment: ${isCI ? 'CI' : 'Local'}`);

  // Use IPv4 addresses explicitly to avoid IPv6 issues in CI
  const backendHealthUrl = 'http://127.0.0.1:3001/health';
  const frontendRootUrl = 'http://127.0.0.1:5173/';

  console.log(`   - Backend Health: ${backendHealthUrl}`);
  console.log(`   - Frontend: ${frontendRootUrl}`);

  try {
    await waitOn({
      resources: [backendHealthUrl, frontendRootUrl],
      timeout: 180000, // 3 minutes for CI cold starts
      interval: 3000, // Check every 3 seconds
      validateStatus: status => status >= 200 && status < 400,
      window: 5000, // Wait for 5 seconds of consecutive success
      verbose: true, // Enable detailed logging
      headers: {
        Accept: 'text/html,application/json',
        'User-Agent': 'Playwright-E2E-Tests',
      },
      // Force TCP/HTTP without SSL and proper connection handling
      strictSSL: false,
      followRedirect: true,
      tcpTimeout: 5000, // Connection timeout
    });
    console.log('✅ All services are ready!');
  } catch (err) {
    console.error('❌ Services did not become ready in time:', err);

    // Enhanced diagnostic commands
    console.log('--- Checking service accessibility ---');
    try {
      console.log('Backend health check (IPv4):');
      execSync('curl -v http://127.0.0.1:3001/health || true', {
        stdio: 'inherit',
      });
      console.log('Backend ready check (IPv4):');
      execSync('curl -v http://127.0.0.1:3001/ready || true', {
        stdio: 'inherit',
      });
      console.log('Frontend root check (IPv4):');
      execSync('curl -v http://127.0.0.1:5173/ || true', {
        stdio: 'inherit',
      });
      console.log('Frontend health check (IPv4):');
      execSync('curl -v http://127.0.0.1:5173/health || true', {
        stdio: 'inherit',
      });

      console.log('--- Docker container status ---');
      execSync(
        'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"',
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
    const response = await fetch('http://127.0.0.1:3001/api/test/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      console.log('✅ Test data cleared successfully.');
    } else {
      console.warn('⚠️ Could not clear test data:', response.statusText);
    }
  } catch (err) {
    console.warn('⚠️ Could not clear test data:', err);
    // Don't throw here - this is not critical for the test setup
  }
}

export default globalSetup;
