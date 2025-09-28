#!/bin/bash

echo "🚀 Starting existing PostgreSQL container..."
docker start datapantry-postgres

# Check if docker start succeeded
if [ $? -ne 0 ]; then
  echo "❌ Error: Failed to start PostgreSQL container."
  exit 1
fi

echo "✅ PostgreSQL container started!"