# Multi-stage Dockerfile for production-ready backend
# Stage 1: Builder
FROM node:18-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm@8.6.12

# Set working directory
WORKDIR /app

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy backend package.json
COPY apps/backend/package.json ./apps/backend/

# Copy prisma directory (needed for client generation)
COPY apps/backend/prisma ./apps/backend/prisma

# Install production dependencies only with frozen lockfile
# Disable Husky git hooks in Docker build environment
ENV HUSKY=0
RUN pnpm install --prod --frozen-lockfile

# Copy the rest of the backend source code
COPY apps/backend/src ./apps/backend/src
COPY apps/backend/tsconfig.json ./apps/backend/

# Generate Prisma client
RUN pnpm --filter backend exec prisma generate

# Build the TypeScript project
RUN pnpm --filter backend build

# Stage 2: Production
FROM node:18-alpine AS production

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy the compiled JavaScript from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/apps/backend/dist ./dist

# Copy prisma directory from builder stage (needed for schema at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/apps/backend/prisma ./prisma

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 3001

# Set the final command to run the application
CMD ["node", "dist/index.js"]