# SQ-QB Integration Monorepo

A comprehensive pnpm-based monorepo for integrating SQ (Square) with QB (QuickBooks), featuring a backend API with Prometheus monitoring and a React administrative dashboard.

## Prerequisites

- Node.js 18+
- pnpm (will be installed via npx if not available)
- Docker and Docker Compose (for development services)

## Quick Start

### 1. Setup Environment

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```bash
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=sq_qb_integration
DATABASE_URL=postgresql://your_username:your_secure_password@localhost:5432/sq_qb_integration?schema=public
```

### 2. Install Dependencies

```bash
npx pnpm install
```

### 3. Start Development Services

Start PostgreSQL and Redis containers:

```bash
npx pnpm docker:up
```

### 4. Setup Database

Generate Prisma client and run initial migration:

```bash
npx pnpm db:generate
npx pnpm db:migrate
```

### 5. Start Development Servers

#### Backend Only

```bash
npx pnpm dev
```

#### Frontend Only

```bash
npx pnpm dev:frontend
```

#### Both Backend and Frontend

```bash
npx pnpm dev:all
```

The backend will be available at `http://localhost:3001` and the frontend at `http://localhost:5173`.

## Available Scripts

### Application Scripts

#### Development

- `npx pnpm dev` - Start backend in development mode
- `npx pnpm dev:frontend` - Start frontend in development mode
- `npx pnpm dev:all` - Start both backend and frontend simultaneously

#### Building

- `npx pnpm build` - Build backend application
- `npx pnpm build:frontend` - Build frontend application
- `npx pnpm build:all` - Build both applications

#### Code Quality

- `npx pnpm lint` - Lint all code (backend + frontend)
- `npx pnpm format` - Format all code with Prettier

### Docker Scripts

- `npx pnpm docker:up` - Start development services (PostgreSQL + Redis)
- `npx pnpm docker:down` - Stop development services
- `npx pnpm docker:logs` - View service logs
- `npx pnpm docker:restart` - Restart services
- `npx pnpm docker:clean` - Stop services and remove volumes

### Database Scripts (Prisma)

- `npx pnpm db:generate` - Generate Prisma client
- `npx pnpm db:migrate` - Run database migrations
- `npx pnpm db:studio` - Open Prisma Studio (database GUI)
- `npx pnpm db:seed` - Seed the database with initial data
- `npx pnpm db:reset` - Reset database and run all migrations

### Testing Scripts

- `npx pnpm test` - Run all tests
- `npx pnpm test:watch` - Run tests in watch mode
- `npx pnpm test:coverage` - Run tests with coverage report

### End-to-End Testing Scripts

- `npx pnpm test:e2e` - Run comprehensive E2E tests with Playwright
- `npx pnpm test:e2e:headed` - Run E2E tests with browser UI visible
- `npx pnpm test:e2e:debug` - Run E2E tests in interactive debug mode
- `npx pnpm test:e2e:install` - Install Playwright browsers and dependencies

## Project Structure

```
sq-qb-integration/
├── apps/
│   ├── backend/           # Backend Node.js/TypeScript application
│       ├── src/
│       │   ├── routes/    # Express route handlers
│       │   │   └── __tests__/ # E2E route tests
│       │   ├── schemas/   # Zod validation schemas
│       │   ├── services/  # Business logic services
│       │   │   ├── mapping/   # Mapping engine architecture
│       │   │   │   ├── __tests__/           # Mapping engine tests
│       │   │   │   ├── mapping.interfaces.ts # Strategy interfaces & types
│       │   │   │   ├── defaultMappingStrategy.ts # Default transformation strategy
│       │   │   │   ├── mappingEngine.ts     # Core mapping orchestrator
│       │   │   │   └── index.ts             # Mapping module exports
│       │   │   ├── __tests__/   # Service unit tests
│       │   │   ├── orderProcessor.ts    # Order processing orchestration
│       │   │   ├── squareClient.ts      # Square API integration
│       │   │   ├── quickBooksClient.ts  # QuickBooks API integration
│       │   │   ├── queueService.ts      # BullMQ queue management
│       │   │   └── securityService.ts   # Webhook signature validation
│       │   ├── middleware/  # Express middleware
│       │   │   └── authMiddleware.ts    # Authentication & validation
│       │   ├── workers/     # Background job processors
│       │   │   └── orderWorker.ts       # BullMQ order processing worker
│       │   ├── setupTests.ts  # Jest test configuration
│       │   └── index.ts   # Application entry point
│       ├── prisma/
│       │   └── schema.prisma # Database schema and models
│       ├── api-contracts.yaml # OpenAPI 3.0 specification
│       ├── jest.config.js # Jest testing configuration
│       ├── package.json
│       └── tsconfig.json
│   └── frontend/          # React TypeScript administrative dashboard
│       ├── src/
│       │   ├── components/    # Reusable UI components
│       │   │   └── Layout.tsx # Main application layout with sidebar
│       │   ├── pages/         # Top-level page components
│       │   │   └── Dashboard.tsx # Administrative dashboard page
│       │   ├── hooks/         # Custom React hooks
│       │   │   └── useApi.ts  # API data fetching hooks
│       │   ├── services/      # API client logic
│       │   │   └── api.ts     # Axios-based API client
│       │   ├── providers/     # React context providers
│       │   │   └── QueryProvider.tsx # React Query client provider
│       │   ├── App.tsx        # Main application component
│       │   ├── main.tsx       # Application entry point
│       │   └── index.css      # Global styles with Tailwind
│       ├── public/            # Static assets
│       ├── dist/              # Production build output
│       ├── tailwind.config.js # Tailwind CSS configuration
│       ├── postcss.config.js  # PostCSS configuration
│       ├── vite.config.ts     # Vite build configuration
│       ├── package.json
│       └── tsconfig.json
├── packages/              # Shared packages and tooling
│   └── e2e-tests/         # End-to-end tests with Playwright
│       ├── tests/         # E2E test files
│       │   └── full-flow.e2e.test.ts # Comprehensive integration tests
│       ├── global-setup.ts   # Test environment setup
│       ├── global-teardown.ts # Test cleanup
│       ├── playwright.config.ts # Playwright configuration
│       ├── package.json   # E2E test dependencies
│       └── README.md      # E2E testing documentation
├── docker-compose.yml     # Development services
├── .env.example          # Environment variables template
├── package.json          # Root package configuration
└── pnpm-workspace.yaml   # Workspace configuration
```

### Monorepo Configuration

The workspace is configured in `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*' # Backend and Frontend applications
  - 'packages/*' # Shared packages (future)
```

## Development Services

The `docker-compose.yml` defines the following services:

- **PostgreSQL 15**: Available on `localhost:5432`
- **Redis 7**: Available on `localhost:6379`

Both services use named volumes for data persistence and include health checks.

## Environment Variables

Create a `.env` file in the root directory with the following configuration:

```bash
# Database Configuration
POSTGRES_USER=sq_qb_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=sq_qb_integration
DATABASE_URL=postgresql://sq_qb_user:your_secure_password@localhost:5432/sq_qb_integration?schema=public

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Square API Configuration
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_APPLICATION_ID=your_square_application_id
SQUARE_ENVIRONMENT=sandbox
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature_key

# QuickBooks API Configuration
QB_ACCESS_TOKEN=your_quickbooks_access_token
QB_REALM_ID=your_quickbooks_realm_id
QB_ENVIRONMENT=sandbox

# Application Configuration
PORT=3001
NODE_ENV=development
WORKER_CONCURRENCY=5
```

Key variables include:

### Database Configuration

- `DATABASE_URL` - PostgreSQL connection string
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` - Database credentials

### Redis Configuration

- `REDIS_HOST`, `REDIS_PORT` - Redis connection details
- `REDIS_PASSWORD`, `REDIS_DB` - Redis authentication and database

### API Configuration

- `SQUARE_ACCESS_TOKEN` - Square API access token
- `SQUARE_APPLICATION_ID` - Square application identifier
- `SQUARE_ENVIRONMENT` - `sandbox` or `production`
- `SQUARE_WEBHOOK_SIGNATURE_KEY` - Webhook signature validation key

- `QB_ACCESS_TOKEN` - QuickBooks API access token
- `QB_REALM_ID` - QuickBooks company identifier
- `QB_ENVIRONMENT` - `sandbox` or `production`

### Application Configuration

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode (`development`, `test`, `production`)
- `WORKER_CONCURRENCY` - Background worker concurrency level

## API Documentation

The backend API is documented using OpenAPI 3.0 specification:

- **Location**: `apps/backend/api-contracts.yaml`
- **Webhook Endpoint**: `POST /api/v1/webhooks/square`
- **Health Check**: `GET /` - Application health status
- **Metrics Endpoint**: `GET /metrics` - Prometheus metrics (text/plain format)
- **Failed Jobs Management**: `GET /api/v1/jobs/failed` - Retrieve all failed jobs
- **Job Retry**: `POST /api/v1/jobs/:jobId/retry` - Retry specific failed jobs
- **Test Endpoints** (Development only):
  - `POST /api/test/clear` - Clear test data (Redis + database)
  - `POST /api/test/force-failure` - Enable forced QuickBooks API failures
  - `POST /api/test/disable-failure` - Disable forced failures
- **Authentication**: Square webhook signature validation
- **Response Formats**: JSON with proper HTTP status codes

## Frontend Administrative Dashboard

The application includes a modern **React TypeScript administrative dashboard** for monitoring and managing the Square-QuickBooks integration in real-time.

### Dashboard Features

#### **Real-Time Monitoring**

- **Order Processing Statistics** - Track successful, failed, and pending orders
- **Queue Management** - Monitor BullMQ job queues with live status updates
- **System Health** - Backend API connectivity and status monitoring
- **Webhook Activity** - Recent Square webhook events timeline

#### **Professional UI/UX**

- **Responsive Design** - Works seamlessly on desktop and mobile devices
- **Sidebar Navigation** - Easy access to Dashboard, Analytics, Queue Monitor, and Settings
- **Real-Time Updates** - Automatic data refresh every 15-30 seconds
- **Loading States** - Smooth user experience with proper loading indicators
- **Error Handling** - Graceful error states with user-friendly messages

#### **Technology Stack**

- **React 19** with TypeScript for type-safe component development
- **Vite** for fast development and optimized production builds
- **Tailwind CSS** for utility-first styling and responsive design
- **React Router** for client-side routing and navigation
- **TanStack Query** for data fetching, caching, and background synchronization
- **Axios** for HTTP requests with interceptors and error handling
- **Headless UI** for accessible, unstyled UI components
- **Heroicons** for beautiful SVG icons

### Dashboard Pages

#### **Main Dashboard** (`/`)

- **Metrics Overview** - Key performance indicators with trend data
- **Order Statistics** - Total, successful, pending, and failed orders
- **Queue Status** - Real-time BullMQ queue depth monitoring
- **Recent Activity** - Latest webhook events and processing status
- **System Health** - Backend connectivity and service status

#### **Analytics** (`/analytics`) - _Coming Soon_

- Advanced metrics visualization
- Historical data analysis
- Performance trend analysis

#### **Queue Monitor** (`/queue`) - _Coming Soon_

- Detailed queue management interface
- Job inspection and retry capabilities
- Queue performance metrics

#### **Failed Jobs** (`/failed-jobs`)

- **Comprehensive Job Monitoring** - View all jobs that have failed processing
- **Detailed Error Information** - Job ID, order data summary, failure reason, and attempt count
- **One-Click Retry** - Retry individual failed jobs with automatic list refresh
- **Real-Time Updates** - Automatic refresh every 15 seconds for live monitoring
- **Responsive Table Design** - Mobile-friendly interface with proper loading states
- **Error Handling** - Graceful error states with retry mechanisms

#### **Settings** (`/settings`) - _Coming Soon_

- Application configuration
- Integration settings management
- User preferences

### Frontend Development

#### **Environment Configuration**

Create `.env` file in `apps/frontend/` for frontend-specific configuration:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001

# Application Configuration
VITE_APP_NAME="SQ-QB Integration Dashboard"
VITE_APP_VERSION="1.0.0"

# Development Configuration
VITE_DEBUG_MODE=true
```

**Note**: Frontend environment variables must be prefixed with `VITE_` to be accessible in the browser. See the main `.env.example` file in the root directory for backend configuration.

#### **Development Workflow**

```bash
# Start frontend development server (port 5173)
npx pnpm dev:frontend

# Start both backend and frontend
npx pnpm dev:all

# Build frontend for production
npx pnpm build:frontend

# Build both applications
npx pnpm build:all
```

#### **API Integration**

The frontend uses a robust API client with:

```typescript
// Automatic retries with exponential backoff
// Request/response interceptors for logging
// Environment-based base URL configuration
// TypeScript interfaces for all API responses

const { data, isLoading, error } = useOrderStats();
const { data: queueStats } = useQueueStats();
const { data: recentWebhooks } = useRecentWebhooks();
```

#### **State Management**

- **React Query** for server state management and caching
- **Automatic background updates** with configurable intervals
- **Optimistic updates** and error recovery
- **DevTools integration** for debugging API calls

#### **Responsive Design**

- **Mobile-first** approach with Tailwind CSS
- **Sidebar navigation** collapses on mobile devices
- **Flexible grid layouts** adapt to screen sizes
- **Touch-friendly** interface elements

### Production Deployment

#### **Build Optimization**

- **Vite build** with automatic code splitting
- **Tree shaking** for minimal bundle size
- **CSS purging** with Tailwind for optimal performance
- **Asset optimization** and compression

#### **Performance Features**

- **React Query caching** reduces API calls
- **Background updates** don't block user interaction
- **Error boundaries** prevent application crashes
- **Loading skeletons** for smooth user experience

## Prometheus Metrics Integration

The backend application includes comprehensive **Prometheus metrics collection** for advanced monitoring and observability.

### Available Metrics

#### **Technical Metrics**

- `api_request_duration_seconds` - HTTP request latency histogram
- `bullmq_jobs_total` - Job processing counter by status
- `bullmq_job_duration_seconds` - Job processing time histogram
- `bullmq_queue_depth` - Queue backlog gauge
- `square_api_duration_seconds` - Square API call latency
- `quickbooks_api_duration_seconds` - QuickBooks API call latency
- `database_query_duration_seconds` - Database operation timing
- `database_connections_active` - Active DB connection count

#### **Business Metrics**

- `webhooks_received_total` - Webhook reception counter
- `orders_processed_total` - Order processing outcomes
- `mapping_strategies_used_total` - Strategy usage patterns

#### **Default Node.js Metrics**

- Process CPU usage, memory consumption, event loop lag
- Garbage collection statistics, active handles/requests

### Metrics Endpoint

Access Prometheus metrics at: `http://localhost:3001/metrics`

```bash
# View all metrics
curl http://localhost:3001/metrics

# Example Prometheus configuration
scrape_configs:
  - job_name: 'square-qb-integration'
    static_configs:
      - targets: ['localhost:3001']
    scrape_interval: 15s
    metrics_path: '/metrics'
```

### Grafana Dashboard Queries

```promql
# API Response Times (95th percentile)
histogram_quantile(0.95, rate(api_request_duration_seconds_bucket[5m]))

# Job Processing Rate
rate(bullmq_jobs_total[5m])

# Queue Depth Over Time
bullmq_queue_depth{status="waiting"}

# External API Success Rate
rate(square_api_duration_seconds_count{status_code="200"}[5m]) /
rate(square_api_duration_seconds_count[5m])
```

### Integration Features

- **Automatic collection** across all application components
- **Minimal performance overhead** (<1ms per operation)
- **Background queue monitoring** every 15 seconds
- **Error resilience** - metrics failures don't affect core functionality

## Mapping Engine Architecture

The application features a configurable **Mapping Engine** that transforms Square order data into QuickBooks sales receipt format using the **Strategy Pattern**. This architecture provides flexibility, extensibility, and testability for different mapping requirements.

### Overview

```
Square Order Data → Mapping Engine → QuickBooks Sales Receipt
                         ↓
              [Strategy Selection & Validation]
                         ↓
              [Configurable Transformation]
```

### Core Components

#### 1. **Mapping Strategy Interface**

All mapping strategies implement the `MappingStrategy` interface:

```typescript
interface MappingStrategy {
  readonly name: string;
  readonly description: string;
  transform(
    order: SquareOrder,
    context?: MappingContext
  ): Promise<QBSalesReceiptData>;
  canHandle(order: SquareOrder, context?: MappingContext): Promise<boolean>;
  getConfigurationSchema(): object;
}
```

#### 2. **Mapping Engine Service**

The central service that manages strategies and orchestrates transformations:

```typescript
const mappingEngine = new MappingEngine();

// Transform using default strategy
const result = await mappingEngine.transform(squareOrder);

// Transform using specific strategy with options
const result = await mappingEngine.transform(squareOrder, {
  strategyName: 'custom',
  options: { defaultCustomerId: '42' },
});
```

#### 3. **Available Strategies**

##### **Default Strategy** (`default`)

The built-in strategy that provides comprehensive Square-to-QuickBooks mapping:

**Features:**

- Line item transformation with quantity and pricing
- Modifier support (add-ons, customizations)
- Tax handling (configurable as separate line items)
- Discount processing (configurable as separate line items)
- Payment method detection from tender information
- Custom item mapping overrides
- Fallback handling for incomplete data

**Configuration Options:**

```typescript
const context: MappingContext = {
  strategyName: 'default',
  options: {
    defaultCustomerId: '42', // QB customer ID
    defaultPaymentMethodId: '5', // QB payment method ID
    includeTaxAsLineItems: true, // Add taxes as separate line items
    includeDiscountsAsLineItems: true, // Add discounts as separate line items
    itemMapping: {
      // Custom item overrides
      'coffee-001': { id: 'QB-123', name: 'Premium Coffee' },
    },
  },
  metadata: {
    merchantId: 'merchant-123',
    locationId: 'location-456',
    timestamp: '2023-10-18T10:00:00.000Z',
  },
};
```

### Enhanced Square Order Support

The mapping engine supports comprehensive Square order data including:

```typescript
interface SquareOrder {
  id: string;
  location_id: string;
  state: 'OPEN' | 'COMPLETED' | 'CANCELED';
  total_money?: { amount: number; currency: string };
  line_items?: SquareLineItem[]; // Products/services
  modifiers?: SquareModifier[]; // Add-ons, customizations
  taxes?: SquareTax[]; // Applied taxes
  discounts?: SquareDiscount[]; // Applied discounts
  tenders?: SquareTender[]; // Payment information
  service_charges?: SquareServiceCharge[]; // Additional charges
}
```

### Order Processing Flow

1. **Webhook Reception**: Square webhook received and validated
2. **Queue Processing**: Order queued for background processing via BullMQ
3. **Strategy Selection**: Mapping engine selects appropriate strategy
4. **Order Validation**: Strategy validates it can handle the order
5. **Data Transformation**: Square order transformed to QuickBooks format
6. **API Integration**: Sales receipt created in QuickBooks
7. **Database Persistence**: Results stored in PostgreSQL

### Extending with Custom Strategies

Create custom strategies for specialized business requirements:

```typescript
export class CustomMappingStrategy implements MappingStrategy {
  readonly name = 'custom';
  readonly description = 'Custom business-specific mapping';

  async transform(order: SquareOrder, context?: MappingContext): Promise<QBSalesReceiptData> {
    // Custom transformation logic
    return {
      CustomerRef: { value: '1', name: 'Custom Customer' },
      Line: [...], // Custom line item mapping
      TotalAmt: order.total_money?.amount || 0 / 100,
      // ... other custom fields
    };
  }

  async canHandle(order: SquareOrder): Promise<boolean> {
    // Custom validation logic
    return order.location_id === 'special-location';
  }

  getConfigurationSchema(): object {
    return {
      type: 'object',
      properties: {
        specialOption: { type: 'string', default: 'value' }
      }
    };
  }
}

// Register and use custom strategy
const mappingEngine = new MappingEngine();
mappingEngine.register(new CustomMappingStrategy());
```

### Error Handling

The mapping engine provides comprehensive error handling:

```typescript
try {
  const result = await mappingEngine.transform(order);
} catch (error) {
  if (error instanceof MappingError) {
    console.error(`Mapping failed: ${error.message}`);
    console.error(`Strategy: ${error.strategyName}`);
    console.error(`Order ID: ${error.orderId}`);
    console.error(`Cause:`, error.cause);
  }
}
```

### Validation and Testing

Validate orders before processing:

```typescript
const validation = await mappingEngine.validateOrder(order, 'default');
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### Configuration Management

Strategies support JSON Schema-based configuration:

```typescript
// Get strategy configuration options
const schema = mappingEngine.getStrategyInfo('default')?.configurationSchema;

// Get all available strategies
const strategies = mappingEngine.getAllStrategyInfo();
```

### Testing Support

The mapping engine includes comprehensive test coverage:

- **Unit Tests**: Individual strategy testing
- **Integration Tests**: End-to-end transformation testing
- **Mock Support**: Strategy mocking for isolated testing

```bash
# Run mapping engine tests
npx pnpm test src/services/mapping/__tests__/

# Run all tests including mapping
npx pnpm test
```

### Performance Considerations

- **Async Processing**: All transformations are asynchronous
- **Background Jobs**: Order processing via BullMQ prevents blocking
- **Strategy Validation**: Pre-transformation validation prevents failures
- **Error Recovery**: Automatic retries with exponential backoff
- **Logging**: Comprehensive logging for debugging and monitoring

## Code Quality

This project uses modern development tools and practices across both backend and frontend:

### Backend Technologies

- **Node.js + TypeScript** with strict configuration and exact optional property types
- **Express.js** for REST API with middleware support
- **Prisma ORM** for type-safe database operations
- **BullMQ** for reliable background job processing with Redis
- **PostgreSQL** for relational data storage
- **Prometheus** for comprehensive metrics and monitoring
- **Jest + Supertest + Nock** for comprehensive testing
- **Zod** for runtime schema validation
- **OpenAPI 3.0** for API contract definition

### Frontend Technologies

- **React 19 + TypeScript** for type-safe component development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for utility-first styling and responsive design
- **TanStack Query** for data fetching, caching, and synchronization
- **React Router** for client-side routing
- **Axios** for HTTP requests with interceptors
- **Headless UI + Heroicons** for accessible UI components

### Development Tools

- **ESLint** for code linting with TypeScript support (backend + frontend)
- **Prettier** for consistent code formatting
- **Husky** for pre-commit hooks ensuring code quality
- **pnpm** for efficient monorepo dependency management
- **Docker Compose** for development services (PostgreSQL + Redis)
- **Concurrently** for running multiple development servers

### Testing Architecture

The project includes comprehensive testing at multiple levels:

#### **Unit Tests**

- **Service Testing**: Individual business logic testing with Jest
- **Component Testing**: Isolated component behavior validation
- **Mock Testing**: External API mocking with Nock for isolation

#### **Integration Tests**

- **Mapping Engine Tests**: Strategy pattern and transformation testing
- **API Endpoint Tests**: HTTP request/response testing with Supertest
- **Database Integration**: Prisma ORM operations testing

#### **End-to-End Tests**

- **Full Stack Testing**: Complete user workflow testing with Playwright
- **Browser Automation**: Multi-browser testing (Chromium, Firefox, WebKit)
- **Real Environment**: Actual database, queue, and API interactions
- **Failure Scenarios**: Error handling and recovery testing
- **UI Validation**: Frontend functionality and responsiveness testing

```bash
# Backend Tests
npx pnpm test                              # All backend tests (54 total)
npx pnpm test src/services/mapping/__tests__/ # Mapping engine tests
npx pnpm test src/routes/__tests__/           # API endpoint tests
npx pnpm test src/services/__tests__/         # Service unit tests
npx pnpm test:coverage                        # Coverage reporting

# Frontend Tests (when implemented)
npx pnpm --filter frontend test              # Frontend unit tests
npx pnpm --filter frontend test:coverage     # Frontend coverage

# End-to-End Tests
npx pnpm test:e2e                            # Full application E2E tests
npx pnpm test:e2e:headed                      # E2E tests with browser UI
npx pnpm test:e2e:debug                       # Interactive E2E debugging

# Full Stack Testing
npx pnpm test:all                            # Run all tests across applications
```

### Security Features

#### **Backend Security**

- **Webhook Signature Validation**: HMAC-SHA256 verification for Square webhooks
- **Timing-Safe Comparisons**: Protection against timing attacks
- **Environment Variable Protection**: Secure credential management
- **Request Body Validation**: Zod schema validation for all inputs
- **Error Sanitization**: Safe error responses without sensitive data exposure

#### **Frontend Security**

- **Environment Variable Scoping**: VITE\_ prefix for safe client-side variables
- **API Base URL Configuration**: Centralized endpoint management
- **Request Interceptors**: Automatic error handling and logging
- **Type Safety**: TypeScript protection against runtime errors

### Development Workflow

#### **Full Stack Development**

```bash
# 1. Setup environment
cp .env.example .env  # Configure backend environment
cp apps/frontend/.env.example apps/frontend/.env  # Configure frontend environment

# 2. Install dependencies
npx pnpm install

# 3. Start services
npx pnpm docker:up     # Start PostgreSQL + Redis
npx pnpm db:generate   # Generate Prisma client
npx pnpm db:migrate    # Run database migrations

# 4. Start development
npx pnpm dev:all       # Start both backend (3001) and frontend (5173)
```

#### **Production Deployment**

```bash
# Build all applications
npx pnpm build:all

# Backend output: apps/backend/dist/
# Frontend output: apps/frontend/dist/
```

#### **Code Quality**

Pre-commit hooks automatically run linting and format checking across both applications to maintain consistent code quality and prevent errors from reaching production.

## 🧪 **End-to-End Testing**

The application includes comprehensive end-to-end tests that validate the entire integration workflow from webhook reception to UI updates.

### **E2E Test Coverage**

#### **Happy Path Testing**

- **Complete Webhook Flow**: Tests Square webhook → BullMQ processing → QuickBooks integration → UI updates
- **Dashboard Validation**: Verifies real-time metrics updates and data consistency
- **Success Scenarios**: Validates successful order processing and job completion

#### **Failure and Recovery Testing**

- **Forced Failures**: Simulates QuickBooks API failures for resilience testing
- **Failed Jobs Management**: Tests administrative interface for failed job monitoring
- **Retry Functionality**: Validates one-click job retry and recovery workflows
- **Error Handling**: Ensures graceful degradation and proper error messaging

#### **UI and Navigation Testing**

- **Multi-Page Navigation**: Tests all dashboard page transitions and routing
- **Responsive Design**: Validates mobile and desktop compatibility across browsers
- **Interactive Elements**: Tests buttons, forms, and real-time data updates

### **Running E2E Tests**

#### **Prerequisites Setup**

```bash
# 1. Install E2E test dependencies and browsers
npx pnpm test:e2e:install

# 2. Start the complete application stack
npx pnpm docker:up          # Start PostgreSQL + Redis
npx pnpm dev:all            # Start backend (3001) + frontend (5173)
```

#### **Test Execution**

```bash
# Run all E2E tests (headless)
npx pnpm test:e2e

# Run with browser UI visible (for debugging)
npx pnpm test:e2e:headed

# Interactive debugging mode
npx pnpm test:e2e:debug
```

#### **Test Scenarios**

1. **Happy Path**: Webhook → Processing → Success → UI Update
2. **Failure Recovery**: Webhook → Failure → Admin Review → Retry → Success
3. **Multiple Orders**: Concurrent webhook processing and accurate counting
4. **Navigation Flow**: Complete dashboard navigation and UI validation

### **E2E Architecture**

#### **Test Environment**

- **Real Services**: Uses actual PostgreSQL, Redis, and HTTP APIs
- **Clean State**: Automatic database and queue cleanup between tests
- **Failure Simulation**: Controlled failure injection for testing resilience
- **Browser Automation**: Playwright testing across Chromium, Firefox, WebKit

#### **Performance Optimizations**

- **Sequential Execution**: Prevents race conditions in shared state
- **Smart Waiting**: Intelligent wait strategies for async operations
- **Artifact Collection**: Screenshots, videos, and traces on failures
- **Minimal Retries**: Fast feedback with targeted retry logic

### **Debugging E2E Tests**

#### **Test Artifacts**

- **Screenshots**: Automatic capture on test failures
- **Videos**: Recording of complete test execution
- **Traces**: Step-by-step execution with network logs
- **Console Logs**: Frontend and backend logging during tests

#### **Common Debugging Commands**

```bash
# View test report with artifacts
cd packages/e2e-tests && npm run test:report

# Run specific test with debug output
npx pnpm test:e2e:debug --grep "happy path"

# Check application health manually
curl http://localhost:3001/     # Backend health
curl http://localhost:5173/     # Frontend availability
```

The E2E tests provide confidence in production deployments by validating the complete user experience and system integration under both normal and failure conditions.

## 🛠️ **Troubleshooting**

### **Common Issues and Solutions**

#### **1. Backend Won't Start**

**Problem**: `pnpm: command not found` or backend fails to start

**Solutions**:

```bash
# Install pnpm globally
npm install -g pnpm

# Or use npx to run pnpm commands
npx pnpm install
npx pnpm dev

# Check if backend is running
curl http://localhost:3001/
```

#### **2. Database Connection Errors**

**Problem**: Database connection fails or migrations don't run

**Solutions**:

```bash
# Ensure Docker services are running
npx pnpm docker:up

# Check Docker container status
docker ps

# Regenerate Prisma client
npx pnpm db:generate

# Reset database if needed
npx pnpm db:reset
```

#### **3. Frontend Build Issues**

**Problem**: TypeScript errors or build failures

**Solutions**:

```bash
# Check for TypeScript errors
cd apps/frontend && npm run build

# Install missing dependencies
npx pnpm install

# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npx pnpm install
```

#### **4. E2E Tests Failing**

**Problem**: Playwright tests fail or hang

**Solutions**:

```bash
# Ensure all services are running
npx pnpm docker:up
npx pnpm dev:all

# Clear test data manually
curl -X POST http://localhost:3001/api/test/clear

# Run tests in debug mode
npx pnpm test:e2e:debug
```

#### **5. Port Conflicts**

**Problem**: Ports 3001 or 5173 already in use

**Solutions**:

```bash
# Find processes using ports
lsof -i :3001
lsof -i :5173

# Kill processes if needed
pkill -f "node.*3001"
pkill -f "vite.*5173"

# Or change ports in configuration files
```

#### **6. Redis/Queue Issues**

**Problem**: Background jobs not processing

**Solutions**:

```bash
# Check Redis connection
docker exec -it sq-qb-integration-redis-1 redis-cli ping

# View Redis logs
npx pnpm docker:logs redis

# Clear Redis data
docker exec -it sq-qb-integration-redis-1 redis-cli FLUSHDB
```

### **Getting Help**

#### **Logs and Debugging**

- **Backend logs**: Console output from `npx pnpm dev`
- **Frontend logs**: Browser developer console
- **Docker logs**: `npx pnpm docker:logs`
- **E2E test artifacts**: `packages/e2e-tests/test-results/`

#### **Health Checks**

```bash
# Backend health
curl http://localhost:3001/

# Frontend availability
curl http://localhost:5173/

# Database connectivity
npx pnpm --filter backend db:studio

# Redis connectivity
docker exec -it sq-qb-integration-redis-1 redis-cli ping
```

#### **Clean Reset**

If issues persist, perform a complete reset:

```bash
# Stop all services
npx pnpm docker:down
pkill -f "npm run dev"
pkill -f "vite"

# Clean Docker volumes
npx pnpm docker:clean

# Reinstall dependencies
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npx pnpm install

# Restart everything
npx pnpm docker:up
npx pnpm db:generate
npx pnpm db:migrate
npx pnpm dev:all
```

## 🏗️ **Architecture & Design Decisions**

### **Technology Choices**

#### **Monorepo Structure**

- **pnpm Workspaces**: Efficient dependency management and workspace isolation
- **Shared Tooling**: Consistent linting, formatting, and testing across applications
- **Independent Deployment**: Each app can be deployed separately while sharing common tooling

#### **Backend Architecture**

- **Express.js**: Mature, flexible web framework with extensive middleware ecosystem
- **TypeScript**: Type safety, better developer experience, and compile-time error catching
- **Prisma ORM**: Type-safe database operations with automatic migration generation
- **BullMQ**: Robust job queue system with Redis for reliable background processing
- **Strategy Pattern**: Configurable mapping engine for flexible data transformation

#### **Frontend Architecture**

- **React + TypeScript**: Component-based UI with type safety
- **Vite**: Fast development server and optimized production builds
- **TanStack Query**: Intelligent data fetching, caching, and synchronization
- **Tailwind CSS**: Utility-first styling for rapid UI development
- **Modular Design**: Clear separation of concerns with hooks, services, and components

#### **Database & Queue Design**

- **PostgreSQL**: Relational database for transactional integrity and complex queries
- **Redis**: In-memory store for job queues and caching
- **Prisma Schema**: Database-first approach with type generation
- **Named Volumes**: Data persistence across Docker container restarts

### **Architectural Patterns**

#### **Microservices Ready**

- **Clear Boundaries**: Distinct applications with well-defined APIs
- **Independent Scaling**: Frontend and backend can scale independently
- **Service Discovery**: Health checks and monitoring endpoints
- **Containerization Ready**: Docker-based development environment

#### **Event-Driven Processing**

- **Webhook Reception**: Asynchronous webhook processing with immediate response
- **Background Jobs**: Heavy processing moved to background workers
- **Queue Management**: Reliable job processing with retries and failure handling
- **Event Sourcing**: Comprehensive logging and audit trails

#### **Security by Design**

- **Webhook Validation**: HMAC signature verification for all incoming webhooks
- **Environment Separation**: Clear distinction between development, test, and production
- **Type Safety**: TypeScript compilation prevents many runtime errors
- **Input Validation**: Zod schema validation for all API inputs

### **Scalability Considerations**

#### **Horizontal Scaling**

- **Stateless Services**: Backend can run multiple instances
- **Queue Workers**: Multiple worker processes for job processing
- **Database Connections**: Connection pooling and efficient queries
- **Frontend CDN Ready**: Static assets can be served from CDN

#### **Performance Optimizations**

- **Background Processing**: Non-blocking webhook responses
- **Database Indexing**: Optimized queries with proper indexing
- **Frontend Caching**: React Query manages data freshness and caching
- **Metrics Collection**: Prometheus monitoring for performance insights

### **Development Principles**

#### **Developer Experience**

- **Fast Feedback**: Hot reload, TypeScript compilation, and comprehensive testing
- **Clear Documentation**: Inline code comments and comprehensive README
- **Consistent Tooling**: Shared linting, formatting, and testing configurations
- **Easy Setup**: One-command development environment startup

#### **Production Readiness**

- **Comprehensive Testing**: Unit, integration, and end-to-end test coverage
- **Error Handling**: Graceful error handling with proper HTTP status codes
- **Monitoring**: Health checks, metrics, and logging for observability
- **Documentation**: OpenAPI specifications and architectural documentation

#### **Maintainability**

- **Clean Code**: Clear naming, proper abstractions, and modular design
- **Type Safety**: TypeScript throughout the stack for compile-time safety
- **Testing Strategy**: Multiple testing levels for confidence in changes
- **Version Control**: Git hooks for code quality enforcement
