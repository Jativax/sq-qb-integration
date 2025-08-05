# Etapa base
FROM node:18-alpine AS base
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
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copia código backend (incluye prisma/)
COPY apps/backend/ ./apps/backend/

# ⚠️ Genera Prisma de forma explícita (apunta al schema del backend)
RUN pnpm --filter backend exec prisma generate --schema apps/backend/prisma/schema.prisma

# Compila TypeScript del backend
RUN pnpm --filter backend build

# Usa pnpm deploy para crear artefactos autocontenidos
RUN pnpm --filter backend deploy --prod /app/deploy

# Etapa runtime mínima
FROM node:18-alpine AS production
ENV NODE_ENV=production
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001
WORKDIR /app

# Copia artefactos autocontenidos del deploy
COPY --from=builder /app/deploy .

RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3001
CMD ["node","dist/server.js"]