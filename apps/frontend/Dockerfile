# apps/frontend/Dockerfile

# ---- Builder Stage ----
# Build the React application
FROM node:18-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.6.12

# Copy all necessary package manifests for a workspace install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/
COPY packages/e2e-tests/package.json ./packages/e2e-tests/

# Install ALL monorepo dependencies (including dev dependencies for building)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy the rest of the frontend source code
COPY apps/frontend/ ./apps/frontend/

# Build the frontend application using a path-based filter
RUN pnpm --filter ./apps/frontend build


# ---- Production Stage ----
# Serve the built application with Nginx
FROM nginx:1.25-alpine AS production

# Copy our custom Nginx configuration, overwriting the default
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built application from the builder stage
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]