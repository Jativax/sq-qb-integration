# End-to-End Tests for Square-QuickBooks Integration

This package contains comprehensive end-to-end tests for the Square-QuickBooks integration application using Playwright.

## 🎯 Test Coverage

### **Happy Path Tests**

- **Full Webhook Processing Flow**: Tests successful webhook reception, job processing, and UI updates
- **Dashboard Metrics Verification**: Validates real-time dashboard statistics updates
- **Failed Jobs Management**: Ensures failed jobs page displays correctly when no failures occur

### **Failure and Recovery Tests**

- **Forced Failure Simulation**: Tests system behavior when QuickBooks API fails
- **Failed Jobs UI**: Validates failed job display in the administrative interface
- **Job Retry Functionality**: Tests one-click job retry with automatic UI refresh
- **Recovery Verification**: Ensures system recovery after successful retry

### **Navigation Tests**

- **Complete UI Navigation**: Tests all dashboard page navigation
- **Responsive Design**: Validates mobile and desktop compatibility
- **Route Handling**: Ensures proper routing between dashboard sections

## 🛠️ Test Architecture

### **Global Setup**

- **Backend Health Check**: Waits for backend API to be ready
- **Test Data Cleanup**: Clears Redis queue and database before tests
- **Environment Validation**: Ensures proper test environment setup

### **Test Utilities**

- **Helper Functions**: Reusable functions for common test operations
- **Mock Data**: Consistent webhook payloads for testing
- **Wait Strategies**: Smart waiting for UI updates and job processing

### **Browser Configuration**

- **Multi-Browser Testing**: Chromium, Firefox, and WebKit support
- **Screenshot/Video Capture**: Automatic capture on test failures
- **Trace Collection**: Detailed trace collection for debugging

## 🚀 Running the Tests

### **Prerequisites**

**1. Install Dependencies**

```bash
# From the root of the monorepo
npx pnpm test:e2e:install
```

**2. Start the Full Application Stack**

```bash
# Terminal 1: Start backend and frontend
npx pnpm dev:all

# Terminal 2: Start development services (PostgreSQL + Redis)
npx pnpm docker:up
```

**3. Verify Services Are Running**

- Backend: http://localhost:3001 (should return health status)
- Frontend: http://localhost:5173 (should load dashboard)
- Database: PostgreSQL on port 5432
- Queue: Redis on port 6379

### **Running Tests**

**Run All E2E Tests**

```bash
npx pnpm test:e2e
```

**Run Tests with Browser UI (Headed Mode)**

```bash
npx pnpm test:e2e:headed
```

**Debug Tests Interactively**

```bash
npx pnpm test:e2e:debug
```

**View Test Report**

```bash
cd packages/e2e-tests && npm run test:report
```

## 📋 Test Scenarios

### **Test 1: Happy Path Workflow**

```typescript
test('should process a valid webhook and display correct stats on dashboard');
```

**Steps:**

1. Clear test data (Redis + database)
2. Navigate to dashboard and verify initial state
3. Send valid Square webhook to backend API
4. Wait for background job processing
5. Verify dashboard metrics updated correctly
6. Check Failed Jobs page shows no failures

**Expected Results:**

- ✅ Webhook accepted with 202 status
- ✅ Dashboard shows incremented order counts
- ✅ Failed Jobs page remains empty
- ✅ All UI elements render correctly

### **Test 2: Failure and Recovery**

```typescript
test('should handle a failed job and allow recovery from the UI');
```

**Steps:**

1. Enable forced QuickBooks API failure
2. Send webhook (will fail during processing)
3. Navigate to Failed Jobs page
4. Verify failed job displayed with error details
5. Disable failure mode and retry job via UI
6. Verify job recovery and dashboard updates

**Expected Results:**

- ✅ Job fails with expected error message
- ✅ Failed job appears in administrative interface
- ✅ Retry button functions correctly
- ✅ Job processes successfully after retry
- ✅ Dashboard reflects successful recovery

### **Test 3: Multiple Webhooks**

```typescript
test('should handle multiple webhooks and display accurate counts');
```

**Steps:**

1. Send multiple webhooks simultaneously
2. Wait for all jobs to process
3. Verify dashboard shows accurate totals

**Expected Results:**

- ✅ All webhooks processed successfully
- ✅ Dashboard counts reflect all processed orders
- ✅ No race conditions or data inconsistencies

### **Test 4: Navigation Flow**

```typescript
test('should navigate between all dashboard pages successfully');
```

**Steps:**

1. Start at Dashboard page
2. Navigate to Analytics, Queue Monitor, Failed Jobs, Settings
3. Verify each page loads correctly
4. Return to Dashboard

**Expected Results:**

- ✅ All navigation links function
- ✅ Page titles and content load correctly
- ✅ URLs update appropriately
- ✅ Responsive design works on all pages

## 🔧 Configuration

### **Playwright Configuration**

- **Base URL**: http://localhost:5173 (frontend)
- **Timeout**: 30 seconds per test
- **Retries**: 2 retries on CI, 0 locally
- **Workers**: 1 (sequential execution for shared state)
- **Browsers**: Chromium, Firefox, WebKit

### **Test Environment**

- **Backend API**: http://localhost:3001
- **Test Endpoints**: `/api/test/*` (development only)
- **Database**: PostgreSQL (cleared before each test)
- **Queue**: Redis (cleared before each test)

## 🐛 Debugging

### **Debug Failed Tests**

```bash
# Run specific test with debug mode
npx pnpm test:e2e:debug --grep "happy path"

# View test artifacts
ls -la packages/e2e-tests/test-results/
```

### **Common Issues**

**1. Backend Not Starting**

```bash
# Check if backend is running
curl http://localhost:3001/

# Start backend manually
cd apps/backend && npm run dev
```

**2. Frontend Not Loading**

```bash
# Check if frontend is running
curl http://localhost:5173/

# Start frontend manually
cd apps/frontend && npm run dev
```

**3. Services Not Available**

```bash
# Start Docker services
npx pnpm docker:up

# Check service status
npx pnpm docker:logs
```

**4. Test Data Conflicts**

```bash
# Manual cleanup
curl -X POST http://localhost:3001/api/test/clear
```

## 📊 Test Reports

### **HTML Report**

- **Location**: `packages/e2e-tests/playwright-report/`
- **View**: `npm run test:report`
- **Features**: Screenshots, videos, traces, network logs

### **Trace Viewer**

- **Automatic**: Generated on first retry
- **Manual**: `--trace on` flag
- **Features**: Step-by-step execution, network activity, console logs

## 🏗️ Architecture Notes

### **Test Design Principles**

- **Isolation**: Each test starts with clean state
- **Reliability**: Proper wait strategies and timeouts
- **Maintainability**: Reusable helper functions
- **Debuggability**: Comprehensive logging and artifacts

### **Performance Considerations**

- **Sequential Execution**: Prevents race conditions
- **Smart Waiting**: Reduces flaky tests
- **Minimal Retries**: Fast feedback loop
- **Cleanup Automation**: Prevents test pollution

### **Real-World Simulation**

- **Actual HTTP Requests**: Tests real API endpoints
- **Background Processing**: Tests BullMQ job processing
- **Database Operations**: Tests Prisma ORM interactions
- **UI Interactions**: Tests real user workflows

## 🎯 Future Enhancements

### **Additional Test Scenarios**

- **Performance Testing**: Load testing with multiple concurrent webhooks
- **Network Failure**: Testing resilience to network issues
- **Database Failures**: Testing database connection recovery
- **Security Testing**: Testing authentication and authorization

### **Enhanced Monitoring**

- **Metrics Validation**: Testing Prometheus metrics collection
- **Health Check Testing**: Testing application health endpoints
- **Error Boundary Testing**: Testing frontend error handling

### **CI/CD Integration**

- **Automated Testing**: Integration with GitHub Actions
- **Parallel Execution**: Multi-worker test execution
- **Cross-Browser Matrix**: Comprehensive browser coverage
