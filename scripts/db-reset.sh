#!/bin/bash

echo "🗑️  Removing existing PostgreSQL container..."
docker stop datapantry-postgres 2>/dev/null || true
docker rm datapantry-postgres 2>/dev/null || true

echo "🐳 Creating fresh PostgreSQL container..."
./scripts/db-setup.sh