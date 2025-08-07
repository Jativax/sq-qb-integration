import { test, expect, Page } from '@playwright/test';

// Sample webhook payload for testing
const VALID_WEBHOOK_PAYLOAD = {
  merchant_id: 'test-merchant-123',
  type: 'order.fulfilled',
  event_id: 'test-event-456',
  created_at: new Date().toISOString(),
  data: {
    type: 'order',
    id: 'test-order-789',
    object: {
      id: 'test-order-789',
      location_id: 'test-location-123',
      state: 'COMPLETED',
      total_money: {
        amount: 1500,
        currency: 'USD',
      },
      line_items: [
        {
          uid: 'test-line-item-1',
          name: 'Test Coffee',
          quantity: '2',
          base_price_money: {
            amount: 750,
            currency: 'USD',
          },
        },
      ],
      tenders: [
        {
          id: 'test-tender-1',
          type: 'CARD',
          amount_money: {
            amount: 1500,
            currency: 'USD',
          },
        },
      ],
    },
  },
};

// Helper function to clear test data
async function clearTestData() {
  const response = await fetch('http://127.0.0.1:3001/api/test/clear', {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to clear test data: ${response.statusText}`);
  }

  console.log('✅ Test data cleared');
}

// Helper function to send webhook
async function sendWebhook(payload = VALID_WEBHOOK_PAYLOAD) {
  const response = await fetch('http://127.0.0.1:3001/api/v1/webhooks/square', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Square-Signature': 'test-signature', // This would be validated in production
    },
    body: JSON.stringify(payload),
  });

  return response;
}

// Helper function to wait for UI updates
async function waitForMetricsUpdate(page: Page, timeout = 10000) {
  // Wait for the dashboard to load and update
  await page.waitForSelector('[data-testid="order-stats"]', { timeout });

  // Wait a bit for data to propagate through the system
  await page.waitForTimeout(2000);
}

// Helper function to enable forced failure
async function enableForcedFailure() {
  const response = await fetch('http://127.0.0.1:3001/api/test/force-failure', {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to enable forced failure: ${response.statusText}`);
  }

  console.log('🔧 Forced failure enabled');
}

// Helper function to disable forced failure
async function disableForcedFailure() {
  const response = await fetch(
    'http://127.0.0.1:3001/api/test/disable-failure',
    {
      method: 'POST',
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to disable forced failure: ${response.statusText}`);
  }

  console.log('🔧 Forced failure disabled');
}

test.describe('Square-QuickBooks Integration E2E Tests', () => {
  test.beforeEach(async () => {
    // Clear test data before each test
    await clearTestData();
  });

  test.afterEach(async () => {
    // Clean up after each test
    await disableForcedFailure();
    await clearTestData();
  });

  test('should process a valid webhook and display correct stats on dashboard', async ({
    page,
  }) => {
    console.log('🧪 Starting happy path E2E test...');

    // Step 1: Navigate to dashboard and verify initial state
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify dashboard loads
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Check initial metrics (should be 0)
    await waitForMetricsUpdate(page);

    const initialTotalOrders = await page
      .locator('[data-testid="total-orders"]')
      .textContent();
    const initialSuccessfulOrders = await page
      .locator('[data-testid="successful-orders"]')
      .textContent();

    console.log(
      `📊 Initial metrics - Total: ${initialTotalOrders}, Successful: ${initialSuccessfulOrders}`
    );

    // Step 2: Send a valid webhook to the backend
    console.log('📤 Sending webhook to backend...');
    const webhookResponse = await sendWebhook();
    expect(webhookResponse.status).toBe(202); // Should return 202 Accepted

    const webhookResult = await webhookResponse.json();
    expect(webhookResult.status).toBe('accepted');
    expect(webhookResult.jobId).toBeTruthy();

    console.log(`✅ Webhook accepted with job ID: ${webhookResult.jobId}`);

    // Step 3: Wait for processing and verify dashboard updates
    console.log('⏳ Waiting for job processing and UI updates...');

    // Wait for the metrics to update (give time for job processing)
    await page.waitForTimeout(5000); // Give BullMQ time to process

    // Refresh the page or wait for auto-refresh
    await page.reload();
    await waitForMetricsUpdate(page);

    // Verify metrics have increased
    const updatedTotalOrders = await page
      .locator('[data-testid="total-orders"]')
      .textContent();
    const updatedSuccessfulOrders = await page
      .locator('[data-testid="successful-orders"]')
      .textContent();

    console.log(
      `📊 Updated metrics - Total: ${updatedTotalOrders}, Successful: ${updatedSuccessfulOrders}`
    );

    // The total and successful orders should have increased by 1
    expect(parseInt(updatedTotalOrders || '0')).toBeGreaterThan(
      parseInt(initialTotalOrders || '0')
    );
    expect(parseInt(updatedSuccessfulOrders || '0')).toBeGreaterThan(
      parseInt(initialSuccessfulOrders || '0')
    );

    // Step 4: Verify Failed Jobs page shows no failed jobs
    console.log('🔍 Checking Failed Jobs page...');
    await page.goto('/failed-jobs');
    await page.waitForLoadState('networkidle');

    // Should show "No failed jobs" message
    await expect(page.locator('text=No failed jobs')).toBeVisible();
    await expect(
      page.locator('text=All jobs are processing successfully')
    ).toBeVisible();

    console.log('✅ Happy path test completed successfully!');
  });

  test('should handle a failed job and allow recovery from the UI', async ({
    page,
  }) => {
    console.log('🧪 Starting failure and recovery E2E test...');

    // Step 1: Enable forced failure mode
    await enableForcedFailure();

    // Step 2: Send webhook that will fail
    console.log('📤 Sending webhook that will fail...');
    const webhookResponse = await sendWebhook();
    expect(webhookResponse.status).toBe(202);

    const webhookResult = await webhookResponse.json();
    expect(webhookResult.jobId).toBeTruthy();

    console.log(`📤 Webhook sent with job ID: ${webhookResult.jobId}`);

    // Step 3: Wait for processing to fail
    console.log('⏳ Waiting for job to fail...');
    await page.waitForTimeout(5000); // Give time for job to process and fail

    // Step 4: Navigate to Failed Jobs page and verify failure
    console.log('🔍 Checking Failed Jobs page for failed job...');
    await page.goto('/failed-jobs');
    await page.waitForLoadState('networkidle');

    // Wait for the failed jobs table to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Verify there's exactly one failed job
    const failedJobRows = page.locator('tbody tr');
    await expect(failedJobRows).toHaveCount(1);

    // Verify job details are displayed
    await expect(page.locator('tbody tr').first()).toContainText(
      'test-order-789'
    );
    await expect(page.locator('tbody tr').first()).toContainText(
      'Forced QuickBooks API failure'
    );

    console.log('✅ Failed job correctly displayed in UI');

    // Step 5: Disable forced failure and retry the job
    await disableForcedFailure();

    console.log('🔄 Attempting to retry the failed job...');

    // Find and click the retry button
    const retryButton = page.locator('button:has-text("Retry")').first();
    await expect(retryButton).toBeVisible();
    await retryButton.click();

    // Wait for the retry to complete
    await page.waitForTimeout(3000);

    // The page should auto-refresh and show no failed jobs
    await expect(page.locator('text=No failed jobs')).toBeVisible({
      timeout: 10000,
    });

    console.log('✅ Job retry successful - no more failed jobs');

    // Step 6: Verify dashboard shows successful processing
    console.log('📊 Verifying dashboard shows successful processing...');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForMetricsUpdate(page);

    // Should now show 1 successful order and 0 failed
    const totalOrders = await page
      .locator('[data-testid="total-orders"]')
      .textContent();
    const successfulOrders = await page
      .locator('[data-testid="successful-orders"]')
      .textContent();
    const failedOrders = await page
      .locator('[data-testid="failed-orders"]')
      .textContent();

    console.log(
      `📊 Final metrics - Total: ${totalOrders}, Successful: ${successfulOrders}, Failed: ${failedOrders}`
    );

    expect(parseInt(successfulOrders || '0')).toBeGreaterThan(0);
    expect(parseInt(failedOrders || '0')).toBe(0);

    console.log('✅ Failure and recovery test completed successfully!');
  });

  test('should handle multiple webhooks and display accurate counts', async ({
    page,
  }) => {
    console.log('🧪 Starting multiple webhooks E2E test...');

    // Send multiple webhooks
    const webhookPromises = [];
    for (let i = 0; i < 3; i++) {
      const payload = {
        ...VALID_WEBHOOK_PAYLOAD,
        event_id: `test-event-${i}`,
        data: {
          ...VALID_WEBHOOK_PAYLOAD.data,
          id: `test-order-${i}`,
          object: {
            ...VALID_WEBHOOK_PAYLOAD.data.object,
            id: `test-order-${i}`,
          },
        },
      };
      webhookPromises.push(sendWebhook(payload));
    }

    const responses = await Promise.all(webhookPromises);
    responses.forEach(response => {
      expect(response.status).toBe(202);
    });

    console.log('📤 Sent 3 webhooks successfully');

    // Wait for processing
    await page.waitForTimeout(8000);

    // Navigate to dashboard and verify counts
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForMetricsUpdate(page);

    const totalOrders = await page
      .locator('[data-testid="total-orders"]')
      .textContent();
    const successfulOrders = await page
      .locator('[data-testid="successful-orders"]')
      .textContent();

    console.log(
      `📊 Multiple webhooks result - Total: ${totalOrders}, Successful: ${successfulOrders}`
    );

    expect(parseInt(totalOrders || '0')).toBeGreaterThanOrEqual(3);
    expect(parseInt(successfulOrders || '0')).toBeGreaterThanOrEqual(3);

    console.log('✅ Multiple webhooks test completed successfully!');
  });
});

test.describe('Frontend Navigation E2E Tests', () => {
  test('should navigate between all dashboard pages successfully', async ({
    page,
  }) => {
    console.log('🧪 Testing navigation between dashboard pages...');

    // Start at home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Navigate to Analytics
    await page.click('text=Analytics');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Analytics');

    // Navigate to Queue Monitor
    await page.click('text=Queue Monitor');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Queue Monitor');

    // Navigate to Failed Jobs
    await page.click('text=Failed Jobs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Failed Jobs');

    // Navigate to Settings
    await page.click('text=Settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Settings');

    // Navigate back to Dashboard
    await page.click('text=Dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Dashboard');

    console.log('✅ Navigation test completed successfully!');
  });
});
