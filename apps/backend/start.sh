#!/bin/sh

# Wait for database and Redis to be ready before starting the application
echo "⏳ Waiting for database to be ready..."
npx wait-on tcp:db:5432

echo "⏳ Waiting for Redis to be ready..."
npx wait-on tcp:redis:6379

echo "✅ Dependencies are ready, starting application..."
exec node dist/server.js 