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
DATABASE_URL=postgresql://your_username:your_secure_password@localhost:6432/sq_qb_integration?pgbouncer=true
PASSWORD_PEPPER=your_long_and_secret_pepper_value_at_least_16_characters
```

**Note**: The DATABASE_URL uses port `6432` (PgBouncer) instead of the direct PostgreSQL port `5432` for connection pooling. The `PASSWORD_PEPPER` is required for enhanced security.

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

Generate Prisma client, run initial migration, and seed with test users:

```bash
npx pnpm db:generate
npx pnpm db:migrate
npx pnpm db:seed
```

**Test Credentials** (seeded automatically):

- **Admin**: `admin@sqqb.com` / `admin123` (full access including job retry)
- **Viewer**: `viewer@sqqb.com` / `viewer123` (read-only access to all data)

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

### CI/CD Validation Scripts

- `npx pnpm ci:checks` - **Comprehensive automated quality gate** for deployment validation

## 🤖 **Automated CI/CD Validation**

The project includes a comprehensive, fully automated validation script (`run-ci-checks.sh`) that serves as the final quality gate before deployment. This script validates the entire project's integrity without any human intervention.

### **Script Features**

- **Fail-Fast Behavior**: Exits immediately on any failure with clear error reporting
- **Comprehensive Coverage**: Tests formatting, linting, compilation, unit tests, and E2E tests
- **Automated Environment**: Sets up Docker services, databases, and applications automatically
- **Self-Cleaning**: Ensures proper cleanup of processes and containers regardless of test outcomes
- **Colored Output**: Clear visual feedback with step-by-step progress indicators

### **Validation Steps Performed**

1. **Code Formatting Check** - Validates Prettier standards across entire codebase
2. **ESLint Code Quality** - Checks for linting errors in frontend and backend
3. **TypeScript Compilation** - Ensures both applications compile without errors
4. **Backend Unit Tests** - Executes Jest test suite for comprehensive code coverage
5. **End-to-End Tests** - Full application flow testing with real database and services
6. **Automatic Cleanup** - Stops processes and containers after testing

### **Usage**

```bash
# Run full CI validation (recommended before deployment)
npx pnpm ci:checks

# Alternative direct execution
bash run-ci-checks.sh
```

### **CI/CD Integration**

This script is designed for seamless integration into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run comprehensive validation
  run: npx pnpm ci:checks
```

**Success Criteria**: Script exits with code `0` and displays "✅ All checks passed! The project is ready for deployment."

## Production Deployment

The application supports secure production deployment using Docker Secrets for sensitive credential management.

### Docker Secrets Architecture

In production, sensitive credentials are managed using Docker Secrets instead of environment variables. This provides enhanced security by:

- Storing secrets in encrypted form
- Mounting secrets as files in containers (not exposed in environment)
- Enabling secure secrets rotation
- Preventing accidental credential exposure in logs

### Setting Up Production Secrets

1. **Create the secrets directory** (already in repository, but gitignored):

   ```bash
   mkdir -p secrets/
   ```

2. **Populate secret files with your production values**:

   ```bash
   # Database credentials
   echo "your_production_postgres_password" > secrets/postgres_password.txt

   # Application security
   echo "your_production_pepper_value_at_least_16_chars" > secrets/password_pepper.txt

   # Square API credentials
   echo "your_production_square_access_token" > secrets/square_access_token.txt
   echo "your_production_square_application_id" > secrets/square_application_id.txt
   echo "your_production_square_webhook_signature_key" > secrets/square_webhook_signature_key.txt

   # QuickBooks API credentials
   echo "your_production_qb_access_token" > secrets/qb_access_token.txt
   echo "your_production_qb_realm_id" > secrets/qb_realm_id.txt
   ```

3. **Set proper file permissions**:
   ```bash
   chmod 600 secrets/*.txt  # Read/write for owner only
   ```

### Production Deployment Commands

#### Building and Publishing Docker Images

Before deploying to production, you need to build and publish the Docker images:

1. **Build the backend image**:
   ```bash
   cd apps/backend
   docker build -t your-docker-registry/sq-qb-backend:latest .
   docker push your-docker-registry/sq-qb-backend:latest
   ```

2. **Build the frontend image**:
   ```bash
   cd apps/frontend
   docker build -t your-docker-registry/sq-qb-frontend:latest .
   docker push your-docker-registry/sq-qb-frontend:latest
   ```

#### Deploying the Production Stack

1. **Deploy with production configuration**:

   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **View production logs**:

   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

3. **Stop production deployment**:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

4. **Update a specific service**:
   ```bash
   # Update backend service with new image
   docker-compose -f docker-compose.prod.yml pull backend
   docker-compose -f docker-compose.prod.yml up -d backend
   ```

### Production Configuration Details

The `docker-compose.prod.yml` file provides a complete production-ready stack:

- **Database Services**: PostgreSQL with PgBouncer connection pooling
- **Cache Service**: Redis with data persistence
- **Backend Service**: Uses pre-built Docker image from registry with Docker secrets integration
- **Frontend Service**: Nginx-served React app with optimized static asset delivery
- **Security Features**: Docker secrets for credential management, non-root containers
- **Performance Optimization**: Resource limits, health checks, and restart policies
- **Networking**: Dedicated bridge network for service isolation

### Environment-Aware Configuration

The application automatically detects the environment and loads configuration accordingly:

- **Development** (`NODE_ENV !== 'production'`): Reads from environment variables (`.env` file)
- **Production** (`NODE_ENV === 'production'`): Reads sensitive values from Docker secret files

This dual approach ensures:

- Easy local development with `.env` files
- Secure production deployment with Docker Secrets
- No code changes required between environments

### Security Best Practices

- ✅ **Never commit** the `secrets/` directory to version control (gitignored)
- ✅ **Use strong passwords** and rotate them regularly
- ✅ **Limit file permissions** on secret files (600 or 400)
- ✅ **Use separate secrets** for each environment (dev/staging/prod)
- ✅ **Monitor secret access** in production environments
- ✅ **Implement secrets rotation** procedures

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
│       │   │   └── QueryProvider.tsx # TanStack Query client provider
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
  - 'packages/*' # Shared packages and tooling (e.g., E2E tests)
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
- **Sidebar Navigation** - Easy access to Dashboard, Analytics, Failed Jobs, Audit Trail, and Settings
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

#### **Analytics** (`/analytics`)

- **Real-time Performance Dashboard** - Live visualization of key performance indicators with 30-second auto-refresh
- **Interactive Data Visualization** - Professional charts using Recharts library (stat cards, bar charts, line charts, pie charts)
- **Comprehensive KPIs** - Job processing metrics, API performance monitoring, system health statistics, and business intelligence
- **Mobile-Responsive Design** - Adaptive layouts optimized for all screen sizes

#### **Failed Jobs** (`/failed-jobs`)

- **Comprehensive Job Monitoring** - View all jobs that have failed processing with detailed error information
- **Administrative Controls** - One-click retry functionality for failed jobs (ADMIN role required)
- **Real-time Updates** - Automatic refresh every 15 seconds for live monitoring
- **Detailed Error Analysis** - Job ID, order data summary, failure reason, and attempt count tracking

#### **Audit Trail** (`/audit-trail`)

- **Comprehensive Activity Logging** - Database-backed audit trail of all system and user actions
- **Advanced Filtering** - Filter by action type, user, or time period for detailed analysis
- **Statistical Insights** - Audit log statistics including most common actions and active users
- **Role-Based Access** - Available to users with VIEWER role or higher

#### **Settings** (`/settings`) - _Coming Soon_

- **Application Configuration** - System-wide settings and preferences management
- **Integration Settings** - Square and QuickBooks API configuration interface
- **User Management** - User account settings and role management (ADMIN only)
- **Mapping Configuration** - Customizable data transformation rules and strategies

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

- **TanStack Query** for server state management and caching
- **Automatic background updates** with configurable intervals
- **Optimistic updates** and error recovery
- **DevTools integration** for debugging API calls

#### **Responsive Design**

- **Mobile-first** approach with Tailwind CSS
- **Sidebar navigation** collapses on mobile devices
- **Flexible grid layouts** adapt to screen sizes
- **Touch-friendly** interface elements

## 🎯 **Recent Improvements & Architecture Enhancements**

The application has undergone significant refactoring to improve maintainability, performance, and developer experience:

### **Backend Improvements**

#### **1. Centralized Configuration Management**

**Location**: `apps/backend/src/config/index.ts`

**Features**:

- **Zod Validation**: All environment variables validated with types at startup
- **Type Safety**: Exported configuration object with full TypeScript support
- **Environment-Specific Validation**: Production requires real API credentials
- **Fail-Fast**: Application exits on startup if configuration is invalid
- **Comprehensive Logging**: Clear error messages for missing/invalid variables

**Benefits**:

```typescript
// Before: Direct environment access throughout codebase
const port = process.env.PORT || 3001;
const redisHost = process.env.REDIS_HOST || 'localhost';

// After: Centralized, typed configuration
import config from './config';
const { PORT, REDIS_HOST } = config; // Fully typed and validated
```

**Configuration Schema**:

```typescript
// All environment variables with validation
NODE_ENV: 'development' | 'production' | 'test'
PORT: number (1-65535, default: 3001)
DATABASE_URL: string (valid URL format)
REDIS_HOST: string (default: 'localhost')
REDIS_PORT: number (1-65535, default: 6379)
SQUARE_WEBHOOK_SIGNATURE_KEY: string (required)
// ... and more with proper types and defaults
```

#### **2. Prisma Singleton Pattern for Database Connections**

**Location**: `apps/backend/src/services/db.ts`

**Features**:

- **Single Connection**: One PrismaClient instance across the entire application
- **Hot-Reload Protection**: Uses `globalThis` in development to prevent connection leaks
- **Environment Awareness**: Different behavior for development vs production
- **Graceful Shutdown**: Centralized cleanup logic for application termination
- **Dependency Injection Removal**: Simplified OrderProcessor and other services

**Benefits**:

```typescript
// Before: Multiple PrismaClient instances
class OrderProcessor {
  constructor(private prismaClient: PrismaClient) {} // DI required
}
const prisma = new PrismaClient(); // Multiple instances created

// After: Singleton pattern
import { getPrismaClient } from './services/db';
class OrderProcessor {
  private prismaClient = getPrismaClient(); // Always same instance
}
```

**Performance Impact**:

- **Reduced Memory**: Single connection pool instead of multiple instances
- **Faster Development**: No connection leaks during hot-reloads
- **Simplified Testing**: Centralized mocking for all database operations

#### **3. Structured Logging with Pino**

**Location**: `apps/backend/src/services/logger.ts`

**Features**:

- **Structured Format**: JSON logs with contextual data instead of plain strings
- **Environment-Aware**: Pretty printing in development, JSON in production
- **Performance**: High-performance logger designed for production use
- **Context-Rich**: Object-based logging with error details, IDs, and metadata

**Benefits**:

```typescript
// Before: Basic console logging
console.log('Processing order:', orderId);
console.error('An error occurred', error);

// After: Structured logging with context
logger.info({ orderId }, 'Processing order');
logger.error({ err: error, orderId }, 'An error occurred');
```

**Log Format Examples**:

```json
// Development (pretty-printed)
INFO: Processing order
  orderId: "order-123"

// Production (JSON for monitoring tools)
{"level":"info","orderId":"order-123","msg":"Processing order","time":"2023-10-18T10:00:00.000Z"}
```

### **Frontend Improvements**

#### **4. Component Organization & Separation of Concerns**

**Improved Structure**:

```
apps/frontend/src/pages/
├── Analytics.tsx    # Dedicated analytics page component
├── Dashboard.tsx    # Main dashboard (existing)
├── FailedJobs.tsx   # Failed jobs management (existing)
├── QueueMonitor.tsx # Queue monitoring page component
└── Settings.tsx     # Application settings page component
```

**Benefits**:

- **Maintainability**: Each page component in its own file with proper documentation
- **Reusability**: Components can be easily imported and tested independently
- **Developer Experience**: Better IDE support with clear file organization
- **Scalability**: Easy to add new pages and features without cluttering App.tsx

**Before vs After**:

```typescript
// Before: Inline components in App.tsx
function Analytics() {
  /* component code */
}
function QueueMonitor() {
  /* component code */
}
function Settings() {
  /* component code */
}

// After: Proper separation with dedicated files
import Analytics from './pages/Analytics';
import QueueMonitor from './pages/QueueMonitor';
import Settings from './pages/Settings';
```

### **Development Workflow Improvements**

#### **Environment Variable Management**

**Backend Configuration** (validated at startup):

```bash
# All variables now validated with proper types
NODE_ENV=development          # Enum: development|production|test
PORT=3001                    # Number validation (1-65535)
DATABASE_URL=postgresql://... # URL format validation
SQUARE_WEBHOOK_SIGNATURE_KEY=key # Required validation
```

#### **Database Connection Management**

**Single Source of Truth**:

```typescript
// Everywhere in the application:
import { getPrismaClient } from './services/db';
const prisma = getPrismaClient(); // Always returns the same instance
```

#### **Logging Consistency**

**Structured Logging Everywhere**:

```typescript
// Services, workers, middleware all use consistent logging:
logger.info({ jobId, orderId }, 'Job started');
logger.error({ err, context }, 'Operation failed');
logger.debug({ query, duration }, 'Database query');
```

### **Production Readiness Enhancements**

#### **Startup Validation**

- **Configuration Errors**: Application won't start with invalid environment variables
- **Database Connection**: Automatic validation of Prisma connection on startup
- **Type Safety**: Compile-time guarantees for all configuration usage

#### **Performance Optimizations**

- **Single Database Connection**: Eliminates connection overhead and pooling issues
- **Structured Logging**: High-performance logging with minimal runtime overhead
- **Environment-Specific Behavior**: Optimized settings for development vs production

#### **Maintainability Improvements**

- **Single Configuration Source**: No more scattered `process.env` access throughout codebase
- **Component Organization**: Clear separation of concerns in frontend architecture
- **Consistent Patterns**: Standardized approaches for logging, database access, and configuration

These improvements represent a significant step toward production-grade architecture with better error handling, performance, and maintainability across the entire application stack.

## 📊 **Analytics & Monitoring Features**

### **Real-Time Dashboard**

The Analytics page provides comprehensive insights into system performance and business metrics:

#### **Key Performance Indicators**

- **Job Processing Metrics**: Success rates, throughput, queue status
- **API Performance**: Response times, error rates, P95 latencies
- **System Health**: Memory usage, uptime, resource utilization
- **Business Intelligence**: Order processing statistics, external API usage

#### **Interactive Visualizations**

- **Stat Cards Grid**: 6 key metrics with trend indicators and status badges
- **Jobs History Chart**: Stacked bar chart showing processing status over time
- **Performance Latency Chart**: Multi-line chart tracking API response times
- **API Usage Chart**: Pie chart for call distribution + bar chart for performance comparison

#### **Real-Time Features**

- **Auto-Refresh**: Live data updates every 30 seconds
- **Smart Caching**: Optimized data fetching with 15-second stale time
- **Error Recovery**: Graceful error handling with one-click retry
- **Mobile Responsive**: Adaptive layouts for all screen sizes

### **Security & Access Control**

- **Role-Based Access**: VIEWER role or higher required for analytics
- **Session Management**: Secure token-based authentication
- **Audit Trail Integration**: All page views and interactions logged
- **Protected Routes**: Automatic redirect to login for unauthenticated users

#### **4. Role-Based Access Control (RBAC) System**

**Location**: `apps/backend/src/services/authService.ts`, `apps/backend/src/middleware/`

**Features**:

- **Secure Authentication**: Argon2 password hashing with session-based auth
- **Role Hierarchy**: ADMIN (full access) > VIEWER (read-only access)
- **Session Management**: 24-hour sessions with automatic extension
- **Protected API Routes**: All endpoints secured with role-based permissions
- **Comprehensive Audit Trail**: All auth events logged with user context

**Database Schema**:

```sql
-- User management with roles
User {
  id: String (CUID)
  email: String (unique)
  password: String (Argon2 hashed)
  role: UserRole (ADMIN | VIEWER)
}

-- Session management for secure auth
Session {
  id: String (CUID)
  token: String (unique, crypto-secure)
  userId: String (foreign key)
  expiresAt: DateTime
}
```

**API Security**:

```typescript
// Protected routes with role requirements
POST /api/v1/jobs/:jobId/retry  // ADMIN only
GET  /api/v1/audit-logs         // VIEWER or higher
GET  /api/v1/analytics          // VIEWER or higher

// Frontend role-based UI
const { isAdmin, isViewer } = useAuth();
{isAdmin && <RetryButton />}  // Conditional rendering
```

**Test Credentials**:

- **Admin**: `admin@sqqb.com` / `admin123` (full access including job retry)
- **Viewer**: `viewer@sqqb.com` / `viewer123` (read-only access to all data)

#### **5. Analytics API Endpoint for Structured Metrics**

**Location**: `apps/backend/src/routes/analytics.ts`

**Features**:

- **Prometheus Metrics Parsing**: Custom parser for text-based Prometheus format
- **Structured JSON Response**: Easy consumption by frontend charting libraries
- **Performance Insights**: Job processing, API latency, queue depth metrics
- **System Monitoring**: Memory usage, uptime, CPU metrics
- **Role-Based Access**: VIEWER role or higher required

**API Endpoints**:

```typescript
GET / api / v1 / analytics / metrics; // Structured JSON metrics
GET / api / v1 / analytics / metrics / raw; // Raw Prometheus format
```

**Response Structure**:

```json
{
  "jobsProcessed": {
    "completed": 150,
    "failed": 5,
    "active": 2,
    "waiting": 10
  },
  "queueDepth": {
    "waiting": 10,
    "active": 2,
    "completed": 150,
    "failed": 5
  },
  "apiMetrics": {
    "totalRequests": 1250,
    "averageResponseTime": 0.125,
    "requestsP95": 0.35
  },
  "externalApiMetrics": {
    "square": {
      "totalCalls": 75,
      "averageResponseTime": 1.2,
      "p95ResponseTime": 2.5
    },
    "quickbooks": {
      "totalCalls": 50,
      "averageResponseTime": 0.8,
      "p95ResponseTime": 1.8
    }
  },
  "systemMetrics": {
    "uptime": 86400,
    "memoryUsage": {
      "used": 128,
      "total": 512,
      "percentage": 25.0
    },
    "cpuUsage": 15.2
  }
}
```

**Benefits**:

- **Frontend Integration**: Direct consumption by React components and charts
- **Performance Monitoring**: Real-time insights into system health
- **Custom Parsing**: No external dependencies for Prometheus metric processing
- **Comprehensive Coverage**: All critical business and system metrics included

#### **6. Frontend Analytics Dashboard Implementation**

**Location**: `apps/frontend/src/pages/Analytics.tsx`, `apps/frontend/src/components/analytics/`

**Features**:

- **Real-time Data Visualization**: Live dashboard with 30-second auto-refresh
- **Professional Charting**: Recharts library for interactive, responsive visualizations
- **Comprehensive Metrics Display**: Key performance indicators and detailed analytics
- **Role-Based Access**: Integrated with RBAC system (VIEWER role or higher required)
- **Responsive Design**: Mobile-first approach with adaptive layouts

**Dashboard Components**:

**StatCardGrid**:

```typescript
// Key metrics overview with 6 primary indicators
- Total Jobs Processed (completed vs failed breakdown)
- Job Success Rate (with trend indicators)
- Current Queue Depth (active jobs status)
- API Request Volume (with P95 latency)
- External API Usage (Square + QuickBooks calls)
- System Health (uptime and memory usage)
```

**JobsHistoryChart**:

```typescript
// Stacked bar chart showing job processing over time
- Color-coded status: Green (completed), Red (failed), Yellow (active), Gray (waiting)
- Interactive tooltips and legend
- Historical comparison capability
```

**PerformanceLatencyChart**:

```typescript
// Multi-line chart for API response times
- Square API latency (P95 response times)
- QuickBooks API latency (P95 response times)
- Internal API latency (application performance)
- 24-hour timeline with performance summary
```

**ApiUsageChart**:

```typescript
// Dual visualization: Pie chart + Bar chart
- Call distribution between Square and QuickBooks APIs
- Performance comparison (average vs P95 latency)
- Comprehensive usage statistics
```

**Technical Implementation**:

```typescript
// API Integration
const { data: metrics, isLoading, error } = useAnalyticsMetrics();

// Auto-refresh configuration
refetchInterval: 30 * 1000, // 30 seconds
staleTime: 15 * 1000,      // 15 seconds cache

// Error handling and loading states
- Professional loading spinners
- User-friendly error messages with retry functionality
- Empty state handling for no data scenarios
```

**Navigation Integration**:

- **Menu Link**: "Analytics" in main sidebar navigation
- **Route**: `/analytics` protected by authentication
- **Icon**: Chart bar icon for visual identification
- **Access Control**: Requires VIEWER role or higher

**Dependencies Added**:

```json
{
  "recharts": "^2.12.7" // React charting library
}
```

**Data Flow Architecture**:

```
Backend Analytics API
  ↓ /api/v1/analytics/metrics
API Service (getAnalyticsMetrics)
  ↓ TypeScript interfaces
TanStack Query Hook (useAnalyticsMetrics)
  ↓ Caching & auto-refresh
Analytics Dashboard Component
  ↓ Data distribution
Chart Components (StatCards, BarChart, LineChart, PieChart)
  ↓ Recharts library
Interactive Visualizations
```

**Responsive Design Features**:

- **Mobile**: Single-column layout with stacked cards
- **Tablet**: 2-column chart grid with optimized spacing
- **Desktop**: 3-column metric cards with side-by-side charts
- **Touch-friendly**: All interactive elements optimized for mobile interaction

### Production Deployment

#### **Build Optimization**

- **Vite build** with automatic code splitting
- **Tree shaking** for minimal bundle size
- **CSS purging** with Tailwind for optimal performance
- **Asset optimization** and compression

#### **Performance Features**

- **TanStack Query caching** reduces API calls
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
- **Frontend Caching**: TanStack Query manages data freshness and caching
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

---

## 🎉 **Latest Release: v1.0.0 - Production-Ready Enterprise Integration**

### **Major Features Added**

#### ✅ **Full-Stack Analytics Dashboard**

- **Real-time Metrics**: Live performance monitoring with 30-second auto-refresh
- **Interactive Charts**: 4 chart types with Recharts library (Stat Cards, Bar, Line, Pie)
- **Comprehensive KPIs**: Job processing, API performance, system health, business metrics
- **Mobile Responsive**: Adaptive layouts for all screen sizes

#### ✅ **Role-Based Access Control (RBAC)**

- **Secure Authentication**: Argon2 password hashing with session management
- **Two User Roles**: ADMIN (full access) and VIEWER (read-only)
- **Protected Routes**: All dashboard pages secured with proper access control
- **Session Security**: 24-hour tokens with automatic extension

#### ✅ **Enhanced API Architecture**

- **Analytics Endpoint**: `/api/v1/analytics/metrics` with structured JSON response
- **Custom Prometheus Parser**: Reliable metrics processing without external dependencies
- **Audit Trail System**: Comprehensive logging of all user and system actions
- **Database-Backed Sessions**: Secure token storage with cleanup

#### ✅ **Production Infrastructure & Security**

- **Docker Secrets Management**: Secure credential handling for production deployments
- **PgBouncer Connection Pooling**: Scalable database connection management
- **Password Pepper Security**: Enhanced password protection with server-side peppering
- **Webhook Security Hardening**: Raw body HMAC validation before JSON parsing
- **Financial Reconciliation**: Automated hourly cron job ensuring data integrity

#### ✅ **Enterprise Architecture**

- **Centralized Configuration**: Zod-validated environment variables with type safety
- **Structured Logging**: Pino logger with development/production configurations
- **Prisma Singleton**: Optimized database connection management
- **Advanced Mapping Engine**: Enhanced financial data transformation with discounts, tips, and surcharges

#### ✅ **Automated CI/CD Quality Gate**

- **Comprehensive Validation Script**: Fully automated `run-ci-checks.sh` with fail-fast behavior
- **Multi-Layer Testing**: Code formatting, linting, compilation, unit tests, and E2E tests
- **Self-Managing Environment**: Automatic Docker setup, database migrations, and cleanup
- **Production-Ready**: Zero-intervention validation suitable for CI/CD pipelines

### **Technical Improvements**

- **TypeScript Coverage**: 100% type safety across backend and frontend
- **Performance Optimization**: Smart caching with TanStack Query
- **Security Hardening**: Token-based auth, protected routes, audit logging
- **Developer Experience**: Hot reload, structured logging, comprehensive error handling
- **Testing**: End-to-end tests with Playwright for critical user flows

### **Ready for Production**

This release represents a **complete enterprise-grade solution** with:

- 🔐 **Security**: RBAC, session management, audit trails
- 📊 **Monitoring**: Real-time analytics and performance metrics
- 🏗️ **Architecture**: Scalable, maintainable, well-documented codebase
- 🧪 **Quality**: Comprehensive testing and type safety
- 📱 **User Experience**: Modern, responsive interface with excellent UX

---

**Built with ❤️ for seamless Square-QuickBooks integration**

_Last Updated: January 2025 - v1.0.0 Production-Ready Enterprise Integration with Full Security & Infrastructure_
