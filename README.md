# SQ-QB Integration Monorepo

A pnpm-based monorepo for integrating SQ (Square) with QB (QuickBooks).

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

### 5. Start Development Server

```bash
npx pnpm dev
```

## Available Scripts

### Application Scripts

- `npx pnpm dev` - Start backend in development mode
- `npx pnpm build` - Build all applications
- `npx pnpm lint` - Lint all code
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

## Project Structure

```
sq-qb-integration/
├── apps/
│   └── backend/           # Backend Node.js/TypeScript application
│       ├── src/
│       │   ├── routes/    # Express route handlers
│       │   ├── schemas/   # Zod validation schemas
│       │   ├── services/  # Business logic services
│       │   │   └── __tests__/ # Service unit tests
│       │   ├── setupTests.ts  # Jest test configuration
│       │   └── index.ts   # Application entry point
│       ├── prisma/
│       │   └── schema.prisma # Database schema and models
│       ├── api-contracts.yaml # OpenAPI 3.0 specification
│       ├── jest.config.js # Jest testing configuration
│       ├── package.json
│       └── tsconfig.json
├── packages/              # Shared packages (future)
├── docker-compose.yml     # Development services
├── .env.example          # Environment variables template
├── package.json          # Root package configuration
└── pnpm-workspace.yaml   # Workspace configuration
```

## Development Services

The `docker-compose.yml` defines the following services:

- **PostgreSQL 15**: Available on `localhost:5432`
- **Redis 7**: Available on `localhost:6379`

Both services use named volumes for data persistence and include health checks.

## Environment Variables

See `.env.example` for all available configuration options.

## API Documentation

The backend API is documented using OpenAPI 3.0 specification:

- **Location**: `apps/backend/api-contracts.yaml`
- **Webhook Endpoint**: `POST /api/v1/webhooks/square`
- **Authentication**: Square webhook signature validation
- **Response Formats**: JSON with proper HTTP status codes

## Code Quality

This project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for pre-commit hooks
- **TypeScript** with strict configuration
- **OpenAPI 3.0** for API contract definition
- **Jest** for unit testing with TypeScript support
- **Supertest** for API endpoint testing
- **Nock** for HTTP request mocking

Pre-commit hooks automatically run linting and format checking.
