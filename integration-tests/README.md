# Integration Tests

Docker Compose environment that spins up a complete Medusa v2 backend pre-loaded with POS-relevant test data.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2+

## Quick Start

```bash
# From the repo root:
yarn test:env:up        # Start all services (first run takes a few minutes to build)
yarn test:env:down      # Stop and remove containers (data is preserved in the volume)
yarn test:env:reset     # Stop, remove containers, AND delete the database volume
```

Or run directly from this directory:

```bash
docker compose up --build      # foreground
docker compose up --build -d   # detached
docker compose down            # stop
docker compose down -v         # stop and delete volumes
```

## What Gets Created

### Services

| Service  | Port | Description |
| -------- | ---- | ----------- |
| Medusa   | 9000 | Backend API |
| Postgres | 5432 | Database    |
| Redis    | 6379 | Cache       |

### Test Data

**Admin user:**

| Field    | Value               |
| -------- | ------------------- |
| Email    | admin@example.com   |
| Password | supersecret         |

**Sales channel:** "POS Channel"

**Stock location:** "Main Store" (linked to POS Channel)

**Region:** United States (USD)

**Products:**

| Product        | Variants                 | Price (USD) |
| -------------- | ------------------------ | ----------- |
| Classic T-Shirt| S, M, L, XL             | $19.99-22.99|
| Coffee Mug     | Default                  | $12.99      |
| Wireless Mouse | Default                  | $34.99      |
| Notebook       | Ruled, Blank             | $8.99       |
| Water Bottle   | 500ml, 1L               | $24.99-29.99|

All variants have SKUs, barcodes, and 100 units of inventory at the Main Store location.

**Customers:**
- Jane Doe (jane.doe@example.com)
- John Smith (john.smith@example.com)
- Walk-in Customer (walkin@example.com)

## Connecting the POS App

1. Start the test environment: `yarn test:env:up`
2. Wait for the health check to pass (Medusa logs "Server is ready")
3. Launch the POS app: `yarn tauri dev`
4. On first launch, enter `http://localhost:9000` as the backend URL
5. Log in with `admin@example.com` / `supersecret`
6. Select "POS Channel" as the sales channel

## Resetting Data

To start fresh, remove the Docker volume:

```bash
yarn test:env:reset
```

The next `yarn test:env:up` will re-run migrations and re-seed all data.

## Configuration

Environment variables are in `.env`. Key settings:

| Variable               | Default                | Description                    |
| ---------------------- | ---------------------- | ------------------------------ |
| MEDUSA_ADMIN_EMAIL     | admin@example.com      | Admin login email              |
| MEDUSA_ADMIN_PASSWORD  | supersecret            | Admin login password           |
| STORE_CORS             | http://localhost:1420   | Tauri dev server origin        |
| ADMIN_CORS             | http://localhost:1420   | Tauri dev server origin        |
| AUTH_CORS              | http://localhost:1420   | Tauri dev server origin        |

## Troubleshooting

**Medusa container keeps restarting:**
Check logs with `docker compose logs medusa`. Common causes:
- Database not ready yet (healthcheck should handle this, but first-time npm install is slow)
- Seed script error due to Medusa API changes -- check the workflow imports in `medusa/src/scripts/seed.ts`

**Port conflicts:**
If 9000, 5432, or 6379 are already in use, either stop the conflicting service or change the port mappings in `docker-compose.yml`.
