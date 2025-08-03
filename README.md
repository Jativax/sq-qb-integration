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

## Project Structure

```
sq-qb-integration/
├── apps/
│   └── backend/           # Backend Node.js/TypeScript application
│       ├── src/
│       │   └── index.ts   # Application entry point
│       ├── prisma/
│       │   └── schema.prisma # Database schema and models
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

## Code Quality

This project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for pre-commit hooks
- **TypeScript** with strict configuration

Pre-commit hooks automatically run linting and format checking.
