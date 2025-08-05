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

# Assert seed output exists
RUN test -f apps/backend/dist/prisma/seed.js

# Usa pnpm deploy para crear artefactos autocontenidos
RUN pnpm --filter backend deploy --prod /app/deploy

# Produce a flat deploy at /app/deploy that matches verifier expectations
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

# Copia artefactos autocontenidos del deploy
COPY --from=builder /app/deploy .

RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3001
CMD ["node","dist/server.js"]