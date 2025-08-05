#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Helper Functions ---
step() {
  echo "🔍 STEP $1: $2"
  echo "ℹ️  $3"
}

success() {
  echo "✅ $1"
}

cleanup() {
  echo "ℹ️  Performing cleanup..."
  pnpm docker:down || true # Run even if previous commands failed
  echo "ℹ️  Cleanup completed"
}

# --- Main Script ---
echo "🚀 Starting SQ-QB Integration CI/CD Validation"
echo "=================================================================="

# Register cleanup function to run on script exit
trap cleanup EXIT

# STEP 1: Code Formatting
step "1" "Code Formatting Check" "Running Prettier format check across the entire codebase..."
pnpm format:check
success "Code formatting is consistent"

# STEP 2: Linting
step "2" "ESLint Code Quality Check" "Running ESLint on frontend and backend code..."
pnpm lint
success "No linting errors found"

# STEP 2.5: Prisma Client Generation (local check)
step "2.5" "Generating Prisma Client" "Generating Prisma client and types..."
pnpm --filter backend exec prisma generate
success "Prisma client generated"

# STEP 3: TypeScript Compilation
step "3" "TypeScript Compilation Check" "Compiling backend TypeScript..."
pnpm --filter backend build
success "Backend TypeScript compilation successful"

echo "ℹ️  Compiling frontend TypeScript..."
pnpm --filter frontend build
success "Frontend TypeScript compilation successful"

# STEP 4: Backend Tests (Unit & Integration)
step "4" "Backend Unit & Integration Tests" "Running Jest test suite for backend..."
pnpm --filter backend test
success "All backend tests passed"

# STEP 5: End-to-End Testing with Docker Environment
step "5" "End-to-End Test Execution" "This step requires Docker environment and will test the full application flow"

# Start Docker services
echo "ℹ️  Starting Docker services (PostgreSQL, Redis, PgBouncer)..."
pnpm docker:up

# Wait for services to be healthy
echo "ℹ️  Waiting for services to initialize (15 seconds)..."
sleep 15

# Apply database migrations and seeding INSIDE the Docker network
echo "ℹ️  Applying database migrations..."
docker compose run --rm backend_service_runner npx prisma migrate deploy --schema=./apps/backend/prisma/schema.prisma

echo "ℹ️  Seeding the database..."
docker compose run --rm backend_service_runner npx prisma db seed --schema=./apps/backend/prisma/schema.prisma

# Start backend and frontend services for E2E testing
echo "ℹ️  Starting backend and frontend services for E2E testing..."
docker compose --profile e2e up -d backend frontend

# Wait for services to be ready
echo "ℹ️  Waiting for application services to be ready..."
sleep 10

# Run Playwright E2E tests, and if they fail, print Docker logs
echo "ℹ️  Running Playwright E2E tests against the live environment..."
if ! pnpm --filter @sq-qb-integration/e2e-tests test; then
  echo "❌ E2E tests failed. Dumping logs for debugging..."
  echo "--- Backend Logs ---"
  docker logs sq-qb-backend --tail 200 || true
  echo "--- Frontend Logs ---"
  docker logs sq-qb-frontend --tail 100 || true
  exit 1
fi

success "All E2E tests passed"
echo "=================================================================="
echo "🏆 All CI/CD checks passed successfully!"