#!/bin/sh
set -e

echo "🚀 Starting backend service..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
until nc -z -v -w30 db 5432
do
  echo "Waiting for database connection..."
  sleep 2
done
echo "✅ Database is ready!"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis..."
until nc -z -v -w30 redis 6379
do
  echo "Waiting for Redis connection..."
  sleep 2
done
echo "✅ Redis is ready!"

# Generate Prisma client if needed
if [ ! -d "node_modules/.prisma" ]; then
  echo "📦 Generating Prisma client..."
  npx prisma generate
fi

# Run migrations in production/CI
if [ "$NODE_ENV" = "production" ] || [ "$NODE_ENV" = "ci" ] || [ "$NODE_ENV" = "test" ]; then
  echo "🔄 Running database migrations..."
  npx prisma migrate deploy || echo "⚠️ Migration failed or already applied"
fi

# Start the application
echo "🎯 Starting Node.js application on port ${PORT:-3001}..."
exec node dist/index.js
