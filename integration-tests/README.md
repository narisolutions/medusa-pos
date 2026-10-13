# Integration Tests

Docker Compose environment that spins up a complete Medusa 2.21 backend (with the POS plugin and the till's payment providers) pre-loaded with POS-relevant test data.

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

| Product                | Variants                 | Price (USD)   |
| ---------------------- | ------------------------ | ------------- |
| USB-C Charging Cable   | 1 m, 1.5 m, 2 m, 3 m     | $9.99–14.99   |
| USB-C Wall Charger 20W | White                    | $18.99        |
| Wireless Optical Mouse | Black                    | $24.99        |
| HDMI 4K Cable          | 1 m, 2 m                 | $12.99–15.99  |
| Portable Power Bank    | 5000 mAh, 10000 mAh      | $22.99–32.99  |

All variants have SKUs, barcodes, and 100 units of inventory at the Main Store location.

**Customers:**
- Jane Doe (jane.doe@example.com)
- John Smith (john.smith@example.com)
- Walk-in Customer (walkin@example.com)

## Demo Shop (for screenshots)

`yarn test:env:demo` turns the running test store into **Northside Electronics**, a demo shop for screenshots
and demos. Run it once, after `yarn test:env:up`:

```bash
yarn test:env:up
yarn test:env:demo
```

It adds, through the same admin API calls the till makes:

- **Branding:** store name, wordmark logo, brand colour (#2563eb), address and phone
- **Payments:** Cash, Card and Bank transfer methods, backed by the `pp_cash_pos`, `pp_card_pos` and
  `pp_banktransfer_pos` providers; bank details
- **Catalog:** five categories and five more products, three of them made without options
- **Quick keys:** five, with short labels
- **Sales:** a week of 12 orders. Most are paid and handed over, one is waiting for pickup, one is delivered and
  unpaid (pay later), and one is refunded.
- **Stock:** one low item and one out of stock, so the badges show

It runs once: the store is marked when done. `yarn test:env:reset` wipes everything, including the demo.

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

**POS shows “Backend unreachable” on `http://localhost:9000`:**

Usually the **Medusa container has exited** (nothing is listening on 9000). Check:

```bash
docker ps -a --filter name=integration-tests-medusa
docker logs integration-tests-medusa-1 2>&1 | tail -80
```

Fix the error in the log (often a **seed script** failure), then `yarn test:env:up` again (use `--build` if you changed `seed.ts`).

**Medusa container keeps restarting:**
Check logs with `docker compose logs medusa`. Common causes:
- Database not ready yet (healthcheck should handle this, but first-time npm install is slow)
- Seed script error due to Medusa API changes -- check the workflow imports in `medusa/src/scripts/seed.ts`

**Port conflicts:**
If 9000, 5432, or 6379 are already in use, either stop the conflicting service or change the port mappings in `docker-compose.yml`.
