# Inventory Reservation System

Live: [TODO: Vercel URL]

---

## What This Is

This is a multi-warehouse inventory reservation system. It temporarily holds stock for a customer during the checkout window so two people can't pay for the same physical unit.

The core constraint: payment takes time (3DS, UPI, wallet redirects), and during that window, other customers are browsing the same catalog. If stock is only deducted at payment time, we oversell. If stock is deducted at cart time, we lose conversions to abandoned carts.

The reservation sits in the middle. It locks stock for 10 minutes. If payment completes, the lock becomes permanent. If it doesn't, the stock goes back.

---

## Architecture

The system runs as a single Next.js application with:

- **Prisma + PostgreSQL (Supabase)** for the data layer. All inventory mutations go through transactions with row-level locking.
- **Upstash Redis** for idempotency key storage. Falls back gracefully if unavailable.
- **React + TanStack Query** on the frontend for data fetching and cache invalidation.

There is no separate worker process. Expiry is handled through a combination of lazy checks on read and a daily cron job (limited by Vercel's free tier).

```
Client (React)
  |
  v
API Routes (/api/*)
  |
  v
Business Logic (lib/reservations.ts)
  |
  +-- Prisma Transaction (SELECT FOR UPDATE + Serializable)
  |     |
  |     v
  |   PostgreSQL (Supabase)
  |
  +-- Idempotency Check
        |
        v
      Redis (Upstash)
```

---

## Reservation Lifecycle

A reservation moves through three states: `PENDING`, `CONFIRMED`, `RELEASED`.

**Reserve** -- The customer selects a product and warehouse, picks a quantity, and hits Reserve. The API locks the inventory row, checks available stock, increments `reservedUnits`, and creates a reservation with a 10-minute expiry. If stock is insufficient, it returns 409.

**Confirm** -- Payment succeeds. The API locks the reservation and inventory rows, verifies the reservation hasn't expired, then decrements both `totalUnits` and `reservedUnits`. The stock is now permanently gone. If the reservation has expired between the user clicking confirm and the request arriving, it auto-releases the stock and returns 410.

**Release** -- Payment fails, user cancels, or the timer runs out. The API decrements `reservedUnits`, returning stock to the available pool. The reservation is marked as RELEASED.

The stock math:

```
Available = totalUnits - reservedUnits

Reserve 3:  totalUnits stays 10, reservedUnits goes to 3.  Available = 7.
Confirm 3:  totalUnits drops to 7, reservedUnits drops to 0.  Available = 7.
Release 3:  totalUnits stays 10, reservedUnits drops to 0.  Available = 10.
```

Confirming decrements both columns by the same amount, so available stock doesn't change at confirmation time. The stock was already "spoken for" when it was reserved.

---

## Concurrency Handling

This is the hardest part of the system and where I spent the most time.

The problem: if two users both see 1 unit available and both try to reserve it, one of them must fail. A naive read-then-write leaves a window where both transactions read the same value before either writes.

The implementation uses Prisma interactive transactions with `SELECT ... FOR UPDATE` on the inventory row, running at `Serializable` isolation:

```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

SELECT id, "totalUnits", "reservedUnits"
FROM inventories
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE;

-- calculate available stock from locked row
-- if insufficient, ROLLBACK (returns 409)
-- if sufficient, UPDATE + INSERT

COMMIT;
```

`FOR UPDATE` acquires an exclusive row-level lock. Any concurrent transaction hitting the same row blocks until this one commits or rolls back. When it unblocks, it sees the updated values.

`Serializable` is an extra safety net against write skew and phantom reads. It's the strictest isolation level PostgreSQL offers. The tradeoff is higher contention under heavy concurrent load, but for a reservation system where correctness matters more than raw throughput, it's the right call.

The same pattern applies to confirm and release. Every mutation that touches inventory goes through a locked transaction. The cleanup job also re-checks status under a lock before releasing, preventing double-release if lazy cleanup and the cron both process the same reservation.

---

## Expiry Strategy

Reservations that aren't acted on need to release their held stock automatically.

**Lazy expiry on read.** When `GET /api/reservations/:id` is called, the handler checks if the reservation is PENDING and past its `expiresAt`. If so, it runs a release transaction before returning the response. This covers the case where a user comes back to a stale checkout page.

**Scheduled cleanup via Vercel Cron.** A cron endpoint at `/api/internal/cleanup-expired-reservations` queries all PENDING reservations where `expiresAt < now()` and releases them individually. Each release runs in its own transaction, so a failure on one doesn't block others.

On Vercel's free tier, cron is limited to daily execution. This means abandoned reservations (where the user closes the tab and never returns) could hold stock for up to 24 hours. In practice, the lazy check handles most cases because the frontend polls the reservation endpoint every 5 seconds. A paid Vercel plan would allow per-minute scheduling for tighter cleanup.

The `reservations` table has a composite index on `(status, expiresAt)` to make the cron query efficient.

---

## Idempotency

The `POST /api/reservations` endpoint supports an `Idempotency-Key` header. If the client sends the same key twice, the server returns the cached response from the first call without creating a duplicate reservation.

Implementation: before processing the request, the handler checks Upstash Redis for a record keyed by the idempotency key. If found, it replays the stored response with an `X-Idempotency-Replay: true` header. If not found, it processes normally and stores the response in Redis with a 24-hour TTL.

If Redis is unavailable (no credentials configured, network failure), the check is skipped entirely. The system still works -- it just loses duplicate protection. This was a deliberate decision to avoid making Redis a hard dependency.

---

## API

### GET /api/products

Returns all products with per-warehouse stock breakdown. Each warehouse entry includes `totalUnits`, `reservedUnits`, and `availableUnits`.

### GET /api/warehouses

Returns all warehouses.

### POST /api/reservations

Reserves stock. Body: `{ productId, warehouseId, quantity }`. Validated with Zod.

- 201: reservation created
- 400: validation error
- 404: product/warehouse not found
- 409: insufficient stock

Supports `Idempotency-Key` header.

### GET /api/reservations/:id

Returns reservation details. Triggers lazy expiry check if the reservation is stale.

### POST /api/reservations/:id/confirm

Confirms the reservation. Permanently deducts stock.

- 200: confirmed
- 409: already released
- 410: expired (stock auto-released)

### POST /api/reservations/:id/release

Releases the reservation. Returns stock to available pool.

- 200: released
- 409: already confirmed

### POST /api/internal/cleanup-expired-reservations

Cron endpoint. Finds and releases all expired PENDING reservations. Protected by optional `CRON_SECRET` bearer token.

---

## Frontend Behavior

Two pages:

**Product listing** (`/`) -- Displays all products in a card grid. Each card shows warehouse-level stock. User selects a warehouse, picks quantity, and clicks Reserve. On success, they're redirected to the checkout page. On 409, they see a toast with the specific error message.

**Checkout page** (`/reservation/:id`) -- Shows reservation details with a live countdown timer (ticks every second via a custom hook). Two action buttons: Confirm Purchase and Cancel. After either action, React Query invalidates the cache and the UI updates without a page refresh. If the user tries to confirm after expiry, the 410 error is surfaced in a toast. The page also polls every 5 seconds to catch server-side status changes.

The frontend API client attaches `statusCode` to thrown errors so components can differentiate between 409, 410, and other failures and show appropriate messaging.

---

## Data Model

Five tables:

- **products** -- catalog entries with name, description, price
- **warehouses** -- warehouse locations
- **inventories** -- per-product per-warehouse stock. `totalUnits` and `reservedUnits` columns. Unique constraint on `(productId, warehouseId)`.
- **reservations** -- tracks each hold. Status enum (PENDING/CONFIRMED/RELEASED), `expiresAt` timestamp, optional `confirmedAt`/`releasedAt`. Indexed on `(status, expiresAt)` for cron queries and `(productId, warehouseId)` for lookups.
- **idempotency_keys** -- stored request/response pairs for idempotent retries (Redis is the primary store, this table exists as a fallback option).

---

## Local Setup

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL, DIRECT_URL, REDIS_URL, REDIS_TOKEN

npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase/Neon pooled connection (port 6543 for Supabase) |
| `DIRECT_URL` | Yes | Direct connection for migrations (port 5432 for Supabase) |
| `REDIS_URL` | No | Upstash Redis REST URL |
| `REDIS_TOKEN` | No | Upstash Redis REST token |
| `NEXT_PUBLIC_APP_URL` | No | App base URL, defaults to empty string |
| `CRON_SECRET` | No | Bearer token for protecting the cleanup endpoint |

### Running Tests

```bash
# start the dev server first, then in another terminal:
npx tsx tests/api-test.ts           # API integration tests
npx tsx tests/concurrency-test.ts   # concurrent reservation safety test
```

The concurrency test fires N simultaneous reservation requests for the same product/warehouse and verifies that the number of successful reservations never exceeds available stock.

---

## Deployment

Push to GitHub. Import in Vercel. Add environment variables. Deploy.

The `vercel.json` file defines the cron schedule for the cleanup endpoint. On Vercel's free tier, this runs once daily. The `prisma generate` step is included in the build script (`"build": "prisma generate && next build"`) so the Prisma client is available at build time.

The database needs to be seeded before the app is usable. Run `npm run db:seed` locally against the hosted database -- the connection strings already point to Supabase.

---

## Stack

- Next.js 16 (App Router)
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)
- Upstash Redis
- Tailwind CSS v4
- shadcn/ui
- TanStack Query (React Query)
- Zod
- Lucide React

---

## Tradeoffs

**Serializable isolation.** Strongest correctness guarantee but creates contention under high concurrency. For a reservation system where overselling has real business consequences, I'd rather have a request queue up briefly than allow an inconsistent write. At true high scale, I'd benchmark whether `Read Committed` + explicit advisory locks gives acceptable guarantees with better throughput.

**Row-level locking over optimistic concurrency.** Pessimistic locking is simpler to reason about. Optimistic locking (version columns + retry loops) would reduce lock contention but pushes complexity into the application layer. For this scope, pessimistic is the right fit.

**10-minute reservation window.** Hardcoded. In production, this should be configurable per product or payment method. UPI confirmations are faster than international card 3DS flows.

**Daily cron on free tier.** Vercel Hobby limits cron to once per day. This means abandoned reservations could hold stock for hours. The lazy cleanup on read mitigates this for any reservation that gets viewed, but truly abandoned ones (user closes tab) sit until the cron runs. A paid plan would allow per-minute scheduling.

**No authentication.** Skipped intentionally to focus on the reservation mechanics. In production, reservations would be scoped to user sessions with rate limiting.

**Single-item reservations.** Each reservation is for one product at one warehouse. A real checkout would need atomic multi-item reservations across warehouses. That's a meaningfully harder problem (distributed transactions or a saga pattern) that I chose not to tackle here.

**Redis as optional dependency.** The system works without Redis, losing only idempotency. This was deliberate -- I didn't want the core reservation flow to depend on cache availability.

---

## What I'd Build Next

- User authentication and per-session reservation limits
- Multi-item cart reservations with atomic stock locking
- WebSocket or SSE for real-time stock updates on the product page
- Payment gateway integration (Stripe/Razorpay webhooks triggering confirm/release)
- Admin dashboard for inventory management and reservation monitoring
- Per-user rate limiting on the reserve endpoint
- Observability: structured logging, error tracking, latency metrics
- E2E tests with Playwright covering the full reserve-confirm and reserve-expire flows
