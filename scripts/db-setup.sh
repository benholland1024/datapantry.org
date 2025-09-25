#!/bin/bash


# Check for .env file
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found in the current directory."
  echo "    Please create a .env file with the required database environment variables."
  exit 1
fi

# Create and start PostgreSQL container
echo "🐳 Starting PostgreSQL container..."
docker run --name datapantry-postgres \
  -e POSTGRES_PASSWORD=${DB_PASSWORD:-postgres} \
  -e POSTGRES_DB=${DB_NAME:-datapantry} \
  -e POSTGRES_USER=${DB_USER:-postgres} \
  -p ${DB_PORT:-5432}:5432 \
  -d postgres:15

# Check if docker run succeeded
if [ $? -ne 0 ]; then
  echo "❌ Error: Failed to start PostgreSQL container."
  exit 1
fi


echo "⏳ Waiting for PostgreSQL to be ready (timeout: 30s)..."
timeout=30
elapsed=0
while ! docker exec datapantry-postgres pg_isready -U ${DB_USER:-postgres} -d ${DB_NAME:-datapantry} > /dev/null 2>&1; do
  if [ $elapsed -ge $timeout ]; then
    echo "❌ Error: PostgreSQL did not become ready within $timeout seconds."
    exit 1
  fi
  echo "  Still waiting... ($elapsed s)"
  sleep 1
  elapsed=$((elapsed+1))
done

echo "✅ PostgreSQL container started successfully!"
echo "📝 Run 'pnpm db:generate && pnpm db:migrate' to set up your schema"