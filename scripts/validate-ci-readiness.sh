#!/bin/bash

echo "🔍 CI/CD Readiness Validation"
echo "=================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation status
VALIDATION_PASSED=true

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $2 exists"
    else
        echo -e "${RED}❌${NC} $2 missing: $1"
        VALIDATION_PASSED=false
    fi
}

# Function to check environment variable
check_env() {
    if grep -q "^$1=" .env.ci 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $1 configured in .env.ci"
    elif grep -q "$1:" .github/workflows/production-ci-cd.yml 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $1 configured in CI workflow"
    else
        echo -e "${YELLOW}⚠️${NC} $1 not found in .env.ci or CI workflow"
    fi
}

echo ""
echo "📁 Checking Required Files..."
echo "------------------------------"
check_file "apps/backend/src/services/securityService.ts" "Security Service"
check_file "packages/e2e-tests/tests/full-flow.e2e.test.ts" "E2E Test Suite"
check_file "docker-compose.ci.yml" "CI Docker Compose"
check_file ".github/workflows/production-ci-cd.yml" "GitHub Workflow"
check_file "packages/e2e-tests/playwright.config.ts" "Playwright Config"

echo ""
echo "🔧 Checking Configuration..."
echo "------------------------------"
check_env "NODE_ENV"
check_env "SQUARE_WEBHOOK_SIGNATURE_KEY"
check_env "SQUARE_WEBHOOK_URL"
check_env "DATABASE_URL"
check_env "PASSWORD_PEPPER"

echo ""
echo "🐳 Checking Docker Services..."
echo "------------------------------"
if docker compose -f docker-compose.yml -f docker-compose.ci.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Docker Compose CI configuration valid"
else
    echo -e "${RED}❌${NC} Docker Compose CI configuration invalid"
    VALIDATION_PASSED=false
fi

echo ""
echo "📦 Checking Dependencies..."
echo "------------------------------"
if [ -f "pnpm-lock.yaml" ]; then
    echo -e "${GREEN}✅${NC} pnpm lockfile exists"
else
    echo -e "${RED}❌${NC} pnpm lockfile missing"
    VALIDATION_PASSED=false
fi

echo ""
echo "🎭 Checking Playwright..."
echo "------------------------------"
if npx playwright --version > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Playwright installed"
else
    echo -e "${YELLOW}⚠️${NC} Playwright not installed"
fi

echo ""
echo "=================================="
if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}✅ CI/CD Pipeline is ready!${NC}"
    exit 0
else
    echo -e "${RED}❌ CI/CD Pipeline has issues that need to be fixed${NC}"
    exit 1
fi 