# SQ-QB Integration Monorepo

> **Full-stack TypeScript monorepo** that synchronizes Square orders with QuickBooks Online in real-time.  
> Features webhook processing, background job queues, admin dashboard, and comprehensive monitoring.

[![CI/CD Pipeline](https://github.com/Jativax/sq-qb-integration/actions/workflows/production-ci-cd.yml/badge.svg)](https://github.com/Jativax/sq-qb-integration/actions/workflows/production-ci-cd.yml)
[![License](https://img.shields.io/github/license/Jativax/sq-qb-integration)](https://github.com/Jativax/sq-qb-integration/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.20+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8.6+-orange.svg)](https://pnpm.io/)

---

## 📖 Table of Contents

- [🎯 Project Overview](#-project-overview)
- [🏗️ Architecture Diagram](#️-architecture-diagram)
- [🛠️ Tech Stack](#️-tech-stack)
- [📋 Prerequisites](#-prerequisites)
- [🚀 Getting Started](#-getting-started)
  - [Clone the Repository](#clone-the-repository)
  - [Install Dependencies](#install-dependencies)
  - [Configure Environment Variables](#configure-environment-variables)
  - [Start Supporting Services](#start-supporting-services)
  - [Database Setup](#database-setup)
  - [Start Development Servers](#start-development-servers)
- [🧪 Testing](#-testing)
  - [Unit & Integration Tests](#unit--integration-tests)
  - [End-to-End Tests](#end-to-end-tests)
- [🚀 CI/CD Pipeline](#-cicd-pipeline)
- [📊 Available Scripts](#-available-scripts)
- [🔧 Troubleshooting & FAQ](#-troubleshooting--faq)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [🙏 Acknowledgements](#-acknowledgements)

---

## 🎯 Project Overview

`sq-qb-integration` is a **production-ready enterprise integration** that:

- **🔗 Real-time Sync**: Listens to Square webhooks → validates signatures → processes orders
- **💾 Data Persistence**: Stores order data in PostgreSQL with Prisma ORM
- **⚡ Background Processing**: Queues sync jobs via BullMQ/Redis for reliable processing
- **🌐 QuickBooks Integration**: Sends processed data to QuickBooks Online via OAuth
- **📊 Admin Dashboard**: React SPA for monitoring jobs, analytics, and system health
- **🔒 Security**: Role-based access control, audit trails, and comprehensive logging

> **💡 Goal**: Keep Square and QuickBooks data in sync in near-real-time while providing enterprise-grade monitoring, security, and reliability.

### **Key Features**

- ✅ **Webhook Processing**: Secure Square webhook reception with signature validation
- ✅ **Background Jobs**: Reliable job processing with retries and dead letter queues
- ✅ **Real-time Dashboard**: Live monitoring with analytics and performance metrics
- ✅ **Role-Based Access**: ADMIN and VIEWER roles with secure authentication
- ✅ **Comprehensive Testing**: Unit, integration, and end-to-end test coverage
- ✅ **Production Ready**: Docker containerization, health checks, and monitoring

---

## 🏗️ Architecture Diagram

```mermaid
graph TD
    subgraph "Frontend (React SPA)"
        UI[Admin Dashboard] -->|REST API| API[Backend API]
        UI -->|Real-time Updates| API
    end

    subgraph "Backend (Node.js/Express)"
        API -->|Webhook Validation| WH[Webhook Handler]
        API -->|Job Management| QM[Queue Manager]
        API -->|Authentication| AUTH[RBAC System]

        WH -->|Order Processing| OP[Order Processor]
        OP -->|Data Mapping| ME[Mapping Engine]
        ME -->|QuickBooks API| QB[QuickBooks Client]

        QM -->|Background Jobs| BJ[BullMQ Workers]
        BJ -->|Database Operations| DB[(PostgreSQL)]
        BJ -->|Cache/Queue| REDIS[(Redis)]
    end

    subgraph "External Services"
        SQ[Square API] -->|Webhooks| WH
        QB -->|OAuth| QBO[QuickBooks Online]
    end

    subgraph "Infrastructure"
        DB -->|Connection Pooling| PGB[PgBouncer]
        REDIS -->|Job Queue| BJ
    end

    style UI fill:#f9f,stroke:#333,stroke-width:2px
    style API fill:#bbf,stroke:#333,stroke-width:2px
    style DB fill:#bfb,stroke:#333,stroke-width:2px
    style REDIS fill:#fbb,stroke:#333,stroke-width:2px
```

---

## 🛠️ Tech Stack

| Layer                | Technology                | Version         | Purpose                               |
| -------------------- | ------------------------- | --------------- | ------------------------------------- |
| **Runtime**          | Node.js                   | 18.20+          | JavaScript runtime                    |
| **Package Manager**  | pnpm (workspace)          | 8.6.12+         | Monorepo dependency management        |
| **Backend**          | Express.js + TypeScript   | 4.x + 5.1+      | API server with type safety           |
| **ORM**              | Prisma                    | 5.1.1           | Type-safe database operations         |
| **Queue**            | BullMQ + Redis            | 5.x + 7.x       | Background job processing             |
| **Database**         | PostgreSQL + PgBouncer    | 15 + 1.23       | Data storage + connection pooling     |
| **Frontend**         | React + Vite + TypeScript | 19 + 5.x + 5.1+ | Admin dashboard SPA                   |
| **Styling**          | Tailwind CSS              | 3.x             | Utility-first CSS framework           |
| **Testing**          | Jest + Playwright         | 29.x + 1.43+    | Unit & E2E testing                    |
| **CI/CD**            | GitHub Actions            | -               | Automated testing & deployment        |
| **Containerization** | Docker Compose            | 2.x             | Development & production deployment   |
| **Monitoring**       | Prometheus                | -               | Metrics collection                    |
| **Security**         | Argon2 + HMAC-SHA256      | -               | Password hashing + webhook validation |

---

## 📋 Prerequisites

### **Required Tools**

| Tool               | Minimum Version | macOS                        | Linux                                                   | Windows                        |
| ------------------ | --------------- | ---------------------------- | ------------------------------------------------------- | ------------------------------ |
| **Node.js**        | 18.20+          | `brew install node@18`       | `sudo apt-get install nodejs`                           | `choco install nodejs`         |
| **pnpm**           | 8.6.12+         | `npm i -g pnpm`              | `npm i -g pnpm`                                         | `npm i -g pnpm`                |
| **Docker**         | 20.10+          | `brew install --cask docker` | [Docker Guide](https://docs.docker.com/engine/install/) | `choco install docker-desktop` |
| **Docker Compose** | 2.0+            | Bundled with Docker Desktop  | `sudo apt-get install docker-compose-plugin`            | Bundled with Docker Desktop    |
| **Git**            | Any             | `brew install git`           | `sudo apt-get install git`                              | `choco install git`            |

### **Optional Tools**

| Tool                    | Purpose             | Install Command               |
| ----------------------- | ------------------- | ----------------------------- |
| **Playwright Browsers** | E2E testing         | `pnpm dlx playwright install` |
| **Vercel CLI**          | Frontend deployment | `npm i -g vercel`             |

> **⚠️ Important**: All commands should be executed from the repository root directory.

---

## 🚀 Getting Started

### **Clone the Repository**

```bash
git clone https://github.com/Jativax/sq-qb-integration.git
cd sq-qb-integration
```

### **Install Dependencies**

```bash
# Install all workspace dependencies
npx pnpm install

# Verify installation
npx pnpm --version
```

> **💡 Note**: This is a pnpm workspace monorepo. The `pnpm install` command will automatically symlink packages and install dependencies for all applications.

### **Configure Environment Variables**

1. **Copy the example environment file**:

   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your credentials**:

   ```bash
   # Database Configuration
   POSTGRES_USER=sq_qb_user
   POSTGRES_PASSWORD=your_secure_password
   POSTGRES_DB=sq_qb_integration
   DATABASE_URL=postgresql://sq_qb_user:your_secure_password@localhost:6432/sq_qb_integration?pgbouncer=true

   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379

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
   PASSWORD_PEPPER=your_long_and_secret_pepper_value_at_least_16_characters
   ```

> **⚠️ Security Note**: The `PASSWORD_PEPPER` is required for enhanced security. Use a strong, random string of at least 16 characters.

### **Start Supporting Services**

```bash
# Start PostgreSQL and Redis containers
npx pnpm docker:up

# Verify services are running
docker compose ps
```

> **💡 Tip**: Use `docker compose logs` to view service logs if needed.

### **Database Setup**

```bash
# Generate Prisma client
npx pnpm db:generate

# Run database migrations
npx pnpm db:migrate

# Seed the database with test users
npx pnpm db:seed
```

**Test Credentials** (seeded automatically):

- **Admin**: `admin@sqqb.com` / `admin123` (full access including job retry)
- **Viewer**: `viewer@sqqb.com` / `viewer123` (read-only access to all data)

### **Start Development Servers**

#### **Option 1: Start Both Backend and Frontend**

```bash
# Start both applications simultaneously
npx pnpm dev:all
```

#### **Option 2: Start Services Individually**

```bash
# Backend only (port 3001)
npx pnpm dev

# Frontend only (port 5173)
npx pnpm dev:frontend
```

#### **Access Your Applications**

- **Backend API**: http://localhost:3001
- **Frontend Dashboard**: http://localhost:5173
- **API Documentation**: http://localhost:3001/api-contracts.yaml
- **Health Check**: http://localhost:3001/health
- **Metrics**: http://localhost:3001/metrics

---

## 🧪 Testing

### **Unit & Integration Tests**

```bash
# Run all backend tests
npx pnpm test

# Run tests in watch mode
npx pnpm test:watch

# Run tests with coverage
npx pnpm test:coverage

# Run specific test suites
npx pnpm --filter backend test src/services/__tests__/
npx pnpm --filter backend test src/routes/__tests__/
```

> **💡 Performance**: Tests use SWC transformer for 3-5x faster execution (0.8s total).

### **End-to-End Tests**

```bash
# Install Playwright browsers (first time only)
npx pnpm test:e2e:install

# Run E2E tests (headless)
npx pnpm test:e2e

# Run with browser UI visible
npx pnpm test:e2e:headed

# Interactive debugging mode
npx pnpm test:e2e:debug
```

> **💡 Note**: E2E tests require the full application stack (PostgreSQL, Redis, backend, frontend) to be running.

---

## 🚀 CI/CD Pipeline

### **Current Status**

**✅ FULLY OPERATIONAL** - All critical issues resolved and pipeline passing consistently.

[![CI/CD Pipeline](https://github.com/Jativax/sq-qb-integration/actions/workflows/production-ci-cd.yml/badge.svg)](https://github.com/Jativax/sq-qb-integration/actions/workflows/production-ci-cd.yml)

### **Pipeline Features**

- ✅ **Automated Testing**: Jest unit tests + Playwright E2E tests
- ✅ **Code Quality**: ESLint + Prettier + TypeScript compilation
- ✅ **Docker Integration**: Multi-container testing with real services
- ✅ **Security Scanning**: Trivy vulnerability scanning + SBOM generation
- ✅ **Health Checks**: Service readiness validation
- ✅ **Zero Manual Intervention**: Fully automated pipeline

### **Running CI Locally**

```bash
# Validate CI readiness
bash scripts/validate-ci-readiness.sh

# Run full CI pipeline locally
npx pnpm ci:checks

# Monitor CI status
bash scripts/monitor-ci.sh
```

### **Recent Critical Fixes (January 2025)**

- **TypeScript Compilation Error**: Removed all `READY_PATH` references from backend code
- **Docker Services Not Starting**: Added explicit Docker service startup step before E2E tests
- **Health Check Alignment**: All services now use `/health` endpoint consistently
- **Service Dependencies**: Fixed frontend dependency on backend with proper health checks

---

## 📊 Available Scripts

### **Development Scripts**

| Script              | Description                        | When to Use            |
| ------------------- | ---------------------------------- | ---------------------- |
| `pnpm dev`          | Start backend in development mode  | Backend development    |
| `pnpm dev:frontend` | Start frontend in development mode | Frontend development   |
| `pnpm dev:all`      | Start both backend and frontend    | Full-stack development |

### **Build Scripts**

| Script                | Description                | When to Use           |
| --------------------- | -------------------------- | --------------------- |
| `pnpm build`          | Build backend application  | Production deployment |
| `pnpm build:frontend` | Build frontend application | Production deployment |
| `pnpm build:all`      | Build both applications    | Complete deployment   |

### **Code Quality Scripts**

| Script              | Description                        | When to Use    |
| ------------------- | ---------------------------------- | -------------- |
| `pnpm lint`         | Lint all code (backend + frontend) | Before commits |
| `pnpm format`       | Format all code with Prettier      | Code cleanup   |
| `pnpm format:check` | Check code formatting              | CI validation  |

### **Database Scripts**

| Script             | Description                       | When to Use          |
| ------------------ | --------------------------------- | -------------------- |
| `pnpm db:generate` | Generate Prisma client            | After schema changes |
| `pnpm db:migrate`  | Run database migrations           | Database updates     |
| `pnpm db:seed`     | Seed database with test data      | Initial setup        |
| `pnpm db:studio`   | Open Prisma Studio (database GUI) | Database exploration |
| `pnpm db:reset`    | Reset database and run migrations | Clean slate          |

### **Testing Scripts**

| Script                 | Description                    | When to Use         |
| ---------------------- | ------------------------------ | ------------------- |
| `pnpm test`            | Run all backend tests          | Development         |
| `pnpm test:watch`      | Run tests in watch mode        | Active development  |
| `pnpm test:coverage`   | Run tests with coverage report | Quality assurance   |
| `pnpm test:e2e`        | Run E2E tests with Playwright  | Integration testing |
| `pnpm test:e2e:headed` | Run E2E tests with browser UI  | Debugging           |
| `pnpm test:e2e:debug`  | Interactive E2E debugging      | Complex debugging   |

### **Docker Scripts**

| Script                | Description                      | When to Use       |
| --------------------- | -------------------------------- | ----------------- |
| `pnpm docker:up`      | Start development services       | Local development |
| `pnpm docker:down`    | Stop development services        | Cleanup           |
| `pnpm docker:logs`    | View service logs                | Debugging         |
| `pnpm docker:restart` | Restart services                 | Service issues    |
| `pnpm docker:clean`   | Stop services and remove volumes | Complete reset    |

### **CI/CD Scripts**

| Script                  | Description                     | When to Use       |
| ----------------------- | ------------------------------- | ----------------- |
| `pnpm ci:checks`        | Run comprehensive CI validation | Before deployment |
| `pnpm test:e2e:install` | Install Playwright browsers     | First-time setup  |

---

## 🔧 Troubleshooting & FAQ

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

### **Health Checks**

```bash
# Backend health
curl http://localhost:3001/health

# Frontend availability
curl http://localhost:5173/

# Database connectivity
npx pnpm --filter backend db:studio

# Redis connectivity
docker exec -it sq-qb-integration-redis-1 redis-cli ping
```

### **Clean Reset**

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

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### **Development Workflow**

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** following the coding standards
4. **Run tests**: `npx pnpm ci:checks`
5. **Commit your changes**: `git commit -m "feat: add your feature"`
6. **Push to your fork**: `git push origin feature/your-feature-name`
7. **Create a Pull Request**

### **Code Standards**

- **TypeScript**: Use strict mode and proper typing
- **ESLint**: Follow the configured linting rules
- **Prettier**: Use the configured formatting
- **Testing**: Add tests for new features
- **Documentation**: Update README for significant changes

### **Pre-commit Hooks**

The project uses Husky to ensure code quality:

- **ESLint**: Lints all TypeScript/JavaScript files
- **Prettier**: Formats code consistently
- **CI Validation**: Runs basic checks before push

### **Testing Requirements**

- **Unit Tests**: Required for new backend features
- **Integration Tests**: Required for API endpoints
- **E2E Tests**: Required for user-facing features
- **Coverage**: Maintain or improve test coverage

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**SPDX Identifier**: `MIT`

---

## 🙏 Acknowledgements

### **Third-Party Services**

- **[Square API](https://developer.squareup.com/)**: Payment processing and order management
- **[QuickBooks Online API](https://developer.intuit.com/app/developer/qbo/docs/)**: Accounting and financial management
- **[Vercel](https://vercel.com/)**: Frontend deployment platform

### **Open Source Libraries**

- **Express.js**: Web framework for Node.js
- **Prisma**: Next-generation ORM for Node.js and TypeScript
- **BullMQ**: Premium job queue for Node.js
- **React**: JavaScript library for building user interfaces
- **Vite**: Next generation frontend tooling
- **Tailwind CSS**: Utility-first CSS framework
- **Playwright**: End-to-end testing framework

### **Development Tools**

- **TypeScript**: Typed JavaScript at scale
- **ESLint**: Pluggable JavaScript linter
- **Prettier**: Opinionated code formatter
- **Jest**: JavaScript testing framework
- **Docker**: Containerization platform

---

**Built with ❤️ for seamless Square-QuickBooks integration**

_Last Updated: January 2025 - v1.0.0 Production-Ready Enterprise Integration_
