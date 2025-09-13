#!/bin/bash

# Create and start PostgreSQL container
echo "🐳 Starting PostgreSQL container..."
docker run --name datapantry-postgres \
  -e POSTGRES_PASSWORD=${DB_PASSWORD:-postgres} \
  -e POSTGRES_DB=${DB_NAME:-datapantry} \
  -e POSTGRES_USER=${DB_USER:-postgres} \
  -p ${DB_PORT:-5432}:5432 \
  -d postgres:15

echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec datapantry-postgres pg_isready -U ${DB_USER:-postgres} -d ${DB_NAME:-datapantry} > /dev/null 2>&1; do
  echo "  Still waiting..."
  sleep 1
done

echo "✅ PostgreSQL container started successfully!"
echo "📝 Run 'pnpm db:generate && pnpm db:migrate' to set up your schema"