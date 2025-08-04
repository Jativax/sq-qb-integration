# Multi-stage Dockerfile for production-ready frontend
# Stage 1: Builder
FROM node:18-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm@8.6.12

# Set working directory
WORKDIR /app

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy frontend package.json
COPY apps/frontend/package.json ./apps/frontend/

# Install production dependencies only with frozen lockfile
RUN pnpm install --prod --frozen-lockfile

# Copy the rest of the frontend source code
COPY apps/frontend/src ./apps/frontend/src
COPY apps/frontend/public ./apps/frontend/public
COPY apps/frontend/index.html ./apps/frontend/
COPY apps/frontend/vite.config.ts ./apps/frontend/
COPY apps/frontend/tsconfig.json ./apps/frontend/
COPY apps/frontend/tsconfig.app.json ./apps/frontend/
COPY apps/frontend/tsconfig.node.json ./apps/frontend/
COPY apps/frontend/tailwind.config.js ./apps/frontend/
COPY apps/frontend/postcss.config.js ./apps/frontend/
COPY apps/frontend/eslint.config.js ./apps/frontend/

# Build the React application
RUN pnpm --filter frontend build

# Stage 2: Production
FROM nginx:stable-alpine AS production

# Remove the default Nginx configuration file
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy static files from builder stage
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Create a non-root user for security
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose port 80
EXPOSE 80

# Start Nginx (default CMD)
CMD ["nginx", "-g", "daemon off;"]