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
pnpm --filter backend exec prisma generate --schema prisma/schema.prisma
success "Prisma client generated"

# STEP 2.6: TypeScript Type Check (local verification)
step "2.6" "TypeScript Type Check" "Verifying TypeScript types without emit..."
pnpm --filter backend exec tsc --noEmit
success "TypeScript types verified"

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
echo "ℹ️  Starting Docker services (PostgreSQL, Redis, Backend CI)..."
pnpm docker:up:ci:direct

# Wait for services to be healthy using Docker health checks
echo "ℹ️  Waiting for services to be healthy..."
echo "ℹ️  Checking PostgreSQL health..."
timeout 60s bash -c 'until docker compose -f docker-compose.yml -f docker-compose.ci.yml exec -T db pg_isready -U "${POSTGRES_USER:-sq_qb_user}" -d "${POSTGRES_DB:-sq_qb_integration}"; do sleep 2; done'
echo "ℹ️  Checking Redis health..."
timeout 30s bash -c 'until docker compose -f docker-compose.yml -f docker-compose.ci.yml exec -T redis redis-cli ping | grep -q PONG; do sleep 2; done'
echo "✅ All infrastructure services are healthy"

# Add diagnostic to check if bind-mount is shadowing /app
echo "ℹ️  Checking for bind-mount issues..."
docker compose -f docker-compose.yml -f docker-compose.ci.yml exec -T backend-ci sh -lc "
  echo 'PWD: \$(pwd)'
  echo '=== /app contents ==='
  ls -la /app/ | head -10
  echo '=== /app/node_modules check ==='
  ls -ld /app/node_modules || echo '❌ /app/node_modules missing - bind-mount issue!'
  echo '=== @prisma/client check ==='
  ls -ld /app/node_modules/@prisma || echo '❌ @prisma missing - bind-mount issue!'
  echo '=== require.resolve test ==='
  node -e \"console.log('@prisma/client path:', require.resolve('@prisma/client'))\" || echo '❌ @prisma/client not resolvable'
"

# Apply database migrations and seeding INSIDE the Docker network
echo "ℹ️  Verifying app contents in container..."
docker compose -f docker-compose.yml -f docker-compose.ci.yml exec -T backend-ci sh -lc "
  set -euo pipefail
  node -e \"console.log(require.resolve('@prisma/client'))\"
  test -f /app/dist/prisma/seed.js
  test -f /app/prisma/schema.prisma
  echo '✅ All required files present'
"

echo "ℹ️  Verifying CI environment configuration..."
echo "NODE_ENV in backend-ci:"
docker compose -f docker-compose.yml -f docker-compose.ci.yml exec -T backend-ci sh -lc 'echo $NODE_ENV'
echo "DATABASE_URL in backend-ci:"
docker compose -f docker-compose.yml -f docker-compose.ci.yml exec -T backend-ci sh -lc 'echo ${DATABASE_URL:-"(not set)"}'

echo "ℹ️  Verifying Prisma versions..."
docker compose -f docker-compose.yml -f docker-compose.ci.yml exec -T backend-ci \
  sh -c "
    set -e
    cd /app

    # Show versions for logs
    echo '---- Prisma CLI version ----'
    npx -y prisma@5.1.1 -v

    # Assert CLI == 5.1.1 (robust to spacing/format)
    npx -y prisma@5.1.1 -v | tr -d '\r' | grep -Eiq '^prisma\s*:?\s*5\.1\.1\b'

    echo '---- @prisma/client version ----'
    node -e \"console.log(require('@prisma/client/package.json').version)\"

    # Assert client == 5.1.1
    node -e \"console.log(require('@prisma/client/package.json').version)\" | grep -Eq '^5\.1\.1$'

    echo '✅ Prisma CLI and Client pinned to 5.1.1'
  "

echo "ℹ️  Applying database migrations..."
docker compose -f docker-compose.yml -f docker-compose.ci.yml exec -T backend-ci \
  sh -c "cd /app && npx prisma migrate deploy"

echo "ℹ️  Seeding the database..."
docker compose -f docker-compose.yml -f docker-compose.ci.yml exec -T backend-ci \
  sh -c "cd /app && npx prisma db seed"

# Start backend and frontend services for E2E testing
echo "ℹ️  Starting backend and frontend services for E2E testing..."
# Use --no-deps to avoid starting PgBouncer dependency
docker compose -f docker-compose.yml -f docker-compose.ci.yml --profile e2e up -d --no-deps backend frontend

# Wait for application services to be ready using health checks
echo "ℹ️  Waiting for application services to be ready..."
echo "ℹ️  Checking backend health..."
echo "ℹ️  Backend container status:"
docker ps --filter name=sq-qb-backend --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true
timeout 180s bash -c '
  attempts=0
  max_attempts=60
  while [ $attempts -lt $max_attempts ]; do
    response=$(curl -sf http://localhost:3001/health 2>&1) && break
    attempts=$((attempts + 1))
    echo "Attempt $attempts/$max_attempts failed: $response"
    sleep 3
  done
  if [ $attempts -eq $max_attempts ]; then
    echo "❌ Backend health check failed after $max_attempts attempts"
    exit 1
  fi
' || {
  echo "❌ Backend failed to become healthy"
  echo "--- Backend Container Status ---"
  docker ps --filter name=sq-qb-backend || true
  echo "--- Backend Logs (Last 200 lines) ---"
  docker logs sq-qb-backend --tail 200 || true
  exit 1
}
echo "ℹ️  Checking frontend health..."
echo "ℹ️  Frontend container status:"
docker ps --filter name=sq-qb-frontend --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true
timeout 120s bash -c '
  attempts=0
  max_attempts=40
  while [ $attempts -lt $max_attempts ]; do
    response=$(curl -sf http://localhost:5173/health 2>&1) && break
    attempts=$((attempts + 1))
    echo "Attempt $attempts/$max_attempts failed: $response"
    sleep 3
  done
  if [ $attempts -eq $max_attempts ]; then
    echo "❌ Frontend health check failed after $max_attempts attempts"
    exit 1
  fi
' || {
  echo "❌ Frontend failed to become healthy"
  echo "--- Frontend Container Status ---"
  docker ps --filter name=sq-qb-frontend || true
  echo "--- Frontend Logs (Last 200 lines) ---"
  docker logs sq-qb-frontend --tail 200 || true
  exit 1
}
echo "✅ All application services are healthy"

# Run Playwright E2E tests, and if they fail, print comprehensive diagnostics
echo "ℹ️  Running Playwright E2E tests against the live environment..."
if ! pnpm --filter @sq-qb-integration/e2e-tests test; then
  echo "❌ E2E tests failed. Dumping comprehensive diagnostics..."
  
  echo "--- Service Status ---"
  docker compose -f docker-compose.yml -f docker-compose.ci.yml ps || true
  
  echo "--- Backend Logs (Last 15 minutes) ---"
  docker compose -f docker-compose.yml -f docker-compose.ci.yml logs --no-color --since=15m backend || true
  
  echo "--- Frontend Logs (Last 15 minutes) ---"
  docker compose -f docker-compose.yml -f docker-compose.ci.yml logs --no-color --since=15m frontend || true
  
  echo "--- Infrastructure Logs (Last 15 minutes) ---"
  docker compose -f docker-compose.yml -f docker-compose.ci.yml logs --no-color --since=15m db redis || true
  
  exit 1
fi

success "All E2E tests passed"
echo "=================================================================="
echo "🏆 All CI/CD checks passed successfully!"