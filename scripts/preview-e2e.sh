#!/bin/bash
# Run preview server for e2e tests
# Environment variables should be set by Playwright webServer env option

echo "Starting preview with test environment..."
echo "DATABASE_URL: $DATABASE_URL"
echo "ADMIN_USER: $ADMIN_USER"
echo "E2E_TEST: $E2E_TEST"

# Run database migrations
echo "Running database migrations..."
bun run db:push

# Run preview
exec bun run preview