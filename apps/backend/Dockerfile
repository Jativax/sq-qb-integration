# apps/backend/Dockerfile

# ---- Base ----
FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@8.6.12


# ---- Builder ----
# This stage installs all dependencies and builds the application.
FROM base AS builder
WORKDIR /app

# Copy all package manifests and the lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/e2e-tests/package.json ./packages/e2e-tests/

# Install ALL monorepo dependencies (including dev dependencies)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy the rest of the backend source code
COPY apps/backend/ ./apps/backend/

# Build the backend application
RUN pnpm --filter backend build

# Use `pnpm deploy` to create a self-contained production-ready folder.
# This command copies the backend's source, its production dependencies,
# and the compiled `dist` folder into `/app/deploy`.
RUN pnpm deploy --filter backend --prod /app/deploy


# ---- Production ----
# This is the final, lean image that will run the application.
FROM base AS production
WORKDIR /app

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# Copy the self-contained deployment folder from the builder stage
COPY --from=builder /app/deploy .

# Change ownership of the files to the non-root user
RUN chown -R appuser:nodejs /app

# Switch to the non-root user
USER appuser

# Expose the application port
EXPOSE 3001

# Set the production environment and run the application
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]