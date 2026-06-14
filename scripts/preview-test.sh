#!/bin/bash
# Load .env.test and export variables
set -a
source .env.test
set +a

echo "Starting preview with test environment..."
echo "DATABASE_URL: $DATABASE_URL"
echo "ADMIN_USER: $ADMIN_USER"

# Run database migrations
echo "Running database migrations..."
bun run db:push

# Run preview
bun run preview
