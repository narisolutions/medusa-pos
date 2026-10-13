#!/bin/sh
set -e

echo "==> Running database migrations..."
# Non-interactive: a container can't answer the link-sync prompt an upgrade raises.
npx medusa db:migrate --execute-all-links

echo "==> Creating admin user..."
npx medusa user --email "$MEDUSA_ADMIN_EMAIL" --password "$MEDUSA_ADMIN_PASSWORD" || echo "Admin user may already exist, continuing..."

echo "==> Running seed script..."
npx medusa exec src/scripts/seed.ts

echo "==> Starting Medusa server..."
npx medusa start
