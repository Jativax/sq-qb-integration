# Etapa base
FROM node:18.20-alpine3.19 AS base
WORKDIR /app
RUN npm i -g pnpm@8.6.12

# Etapa builder
FROM base AS builder
WORKDIR /app

# Archivos raíz del monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Manifiestos para resolver workspaces
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/e2e-tests/package.json ./packages/e2e-tests/

# Instala dependencias sin scripts (evita postinstall de Prisma)
# Use pnpm cache mount for faster builds with BuildKit
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store/v3 \
    pnpm install --frozen-lockfile --ignore-scripts

# Copia código backend (incluye prisma/)
COPY apps/backend/ ./apps/backend/

# Generate Prisma Client (already correct)
RUN pnpm --filter backend exec prisma generate --schema prisma/schema.prisma

# Build backend + seed (explicit)
RUN pnpm --filter backend run build \
 && pnpm --filter backend run build:seed

# Ensure seed.js is properly generated and copied
RUN set -eux; \
    echo "=== Checking seed build process ==="; \
    echo "Contents of apps/backend/prisma:"; \
    ls -la apps/backend/prisma/ || true; \
    echo "=== Running seed build explicitly ==="; \
    cd apps/backend && pnpm run build:seed; \
    echo "=== Checking dist directory after build ==="; \
    ls -la apps/backend/dist/ || true; \
    echo "=== Creating prisma directory if missing ==="; \
    mkdir -p apps/backend/dist/prisma; \
    echo "=== Copying seed.js to expected location ==="; \
    if [ -f "apps/backend/dist/seed.js" ]; then \
      cp apps/backend/dist/seed.js apps/backend/dist/prisma/seed.js; \
      echo "✅ Copied seed.js from dist/ to dist/prisma/"; \
    elif [ -f "apps/backend/dist/prisma/seed.js" ]; then \
      echo "✅ seed.js already in correct location"; \
    elif [ -f "apps/backend/prisma/seed.js" ]; then \
      cp apps/backend/prisma/seed.js apps/backend/dist/prisma/seed.js; \
      echo "✅ Copied seed.js from prisma/ to dist/prisma/"; \
    else \
      echo "❌ seed.js not found in any expected location"; \
      echo "Searching for seed.js files:"; \
      find apps/backend -name "seed.js" -type f -print || echo "No seed.js files found"; \
      echo "=== Checking TypeScript compilation output ==="; \
      echo "Contents of apps/backend/dist (if exists):"; \
      ls -la apps/backend/dist/ || echo "dist directory does not exist"; \
      echo "=== Checking for any .js files in backend:"; \
      find apps/backend -name "*.js" -type f -print || echo "No .js files found"; \
      echo "=== Checking TypeScript build info:"; \
      find apps/backend -name "*.tsbuildinfo" -type f -print || echo "No tsbuildinfo files found"; \
      echo "=== Checking TypeScript compilation errors ==="; \
      cd apps/backend && pnpm run build:seed || echo "TypeScript compilation failed"; \
      exit 1; \
    fi

# Assert seed output exists with diagnostics if missing
RUN set -eux; \
    SEED_PATH="apps/backend/dist/prisma/seed.js"; \
    if [ ! -f "$SEED_PATH" ]; then \
      echo "❌ seed.js not found at $SEED_PATH"; \
      echo "Contents of apps/backend/dist:"; \
      ls -la apps/backend/dist || true; \
      echo "Contents of apps/backend/dist/prisma (if exists):"; \
      ls -la apps/backend/dist/prisma || echo "prisma directory does not exist"; \
      echo "Searching for any seed.js files under apps/backend:"; \
      find apps/backend -name "seed.js" -type f -print || echo "No seed.js files found"; \
      echo "Checking TypeScript build info:"; \
      ls -la apps/backend/dist/*.tsbuildinfo || echo "No tsbuildinfo files"; \
      exit 1; \
    fi \
    && echo "✅ seed.js found at $SEED_PATH"

# Usa pnpm deploy para crear artefactos autocontenidos
RUN pnpm --filter backend deploy --prod /app/deploy

# Build deploy artifacts
RUN mkdir -p /app/deploy/prisma /app/deploy/dist/prisma \
 && cp -r apps/backend/prisma/* /app/deploy/prisma/ \
 && cp apps/backend/dist/prisma/seed.js /app/deploy/dist/prisma/

# Etapa runtime mínima
FROM node:18.20-alpine3.19 AS production
ENV NODE_ENV=production

# Add native dependencies for Prisma engines and TLS connections
RUN apk add --no-cache openssl ca-certificates libstdc++

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
WORKDIR /app

# Copy deploy artifacts to production stage
COPY --from=builder /app/deploy .

RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3001
CMD ["node","dist/server.js"]