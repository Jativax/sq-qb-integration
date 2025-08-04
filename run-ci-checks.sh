#!/bin/bash

# SQ-QB Integration - Comprehensive CI/CD Validation Script
# This script validates the entire project's integrity without human intervention
# Fail-fast behavior: exits immediately on any error

set -e  # Exit immediately on any command failure
set -u  # Exit on undefined variables

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}🔍 STEP $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Function to cleanup background processes and Docker
cleanup() {
    print_info "Performing cleanup..."
    
    # Kill any background Node.js processes
    pkill -f "vite" || true
    pkill -f "ts-node" || true
    pkill -f "node.*src/index" || true
    
    # Stop Docker services
    npx pnpm docker:down || true
    
    print_info "Cleanup completed"
}

# Trap to ensure cleanup runs even if script fails
trap cleanup EXIT

# Start the validation process
echo -e "${GREEN}🚀 Starting SQ-QB Integration CI/CD Validation${NC}"
echo "=================================================================="

# STEP 1: Code Formatting Check
print_step "1" "Code Formatting Check"
print_info "Running Prettier format check across the entire codebase..."
npx pnpm format:check
print_success "Code formatting is consistent"

# STEP 2: Linting Check
print_step "2" "ESLint Code Quality Check"
print_info "Running ESLint on frontend and backend code..."
npx pnpm lint
print_success "No linting errors found"

# STEP 2.5: Generating Prisma Client
print_step "2.5" "Generating Prisma Client"
print_info "Generating Prisma client and types..."
npx pnpm --filter backend exec prisma generate
print_success "Prisma client generated"

# STEP 3: TypeScript Compilation Check
print_step "3" "TypeScript Compilation Check"

print_info "Compiling backend TypeScript..."
npx pnpm --filter backend build
print_success "Backend TypeScript compilation successful"

print_info "Compiling frontend TypeScript..."
npx pnpm --filter frontend build
print_success "Frontend TypeScript compilation successful"

# STEP 4: Backend Unit & Integration Tests
print_step "4" "Backend Unit & Integration Tests"
print_info "Running Jest test suite for backend..."
npx pnpm --filter backend test
print_success "All backend tests passed"

# STEP 5: End-to-End Test Execution
print_step "5" "End-to-End Test Execution"
print_info "This step requires Docker environment and will test the full application flow"

print_info "Starting Docker services (PostgreSQL, Redis, PgBouncer)..."
npx pnpm docker:up -d

print_info "Waiting for services to initialize (15 seconds)..."
sleep 15

print_info "Applying database migrations..."
docker compose run --rm backend_service_runner npx prisma migrate deploy --schema=./apps/backend/prisma/schema.prisma

print_info "Seeding database with test data..."
docker compose run --rm backend_service_runner npx prisma db seed --schema=./apps/backend/prisma/schema.prisma

print_info "Starting backend application in background..."
npx dotenv -e .env.ci -- npx pnpm dev > backend.log 2>&1 &
BACKEND_PID=$!

print_info "Starting frontend application in background..."
npx pnpm dev:frontend > frontend.log 2>&1 &
FRONTEND_PID=$!

print_info "Waiting for applications to start (10 seconds)..."
sleep 10

print_info "Checking if applications are responding..."
# Quick health check
curl -f http://localhost:3001/health || {
    print_error "Backend health check failed"
    cat backend.log
    exit 1
}

curl -f http://localhost:5173 || {
    print_error "Frontend health check failed"  
    cat frontend.log
    exit 1
}

print_info "Running Playwright E2E tests..."
npx dotenv -e .env.ci -- npx pnpm test:e2e
print_success "All E2E tests passed"

# STEP 6: Final Validation Summary
print_step "6" "Final Validation Summary"
echo "=================================================================="
print_success "Code Formatting: PASSED"
print_success "ESLint Quality: PASSED"
print_success "TypeScript Compilation: PASSED"
print_success "Backend Tests: PASSED"
print_success "E2E Tests: PASSED"
echo "=================================================================="

echo -e "${GREEN}🎉 ALL CHECKS PASSED! The project is ready for deployment.${NC}"
echo -e "${GREEN}✅ SQ-QB Integration v1.0.0 - Production Quality Validated${NC}"

exit 0