# StockReserve - Inventory Reservation System

A concurrency-safe inventory reservation and order fulfillment system built for multi-warehouse ecommerce. This project solves the classic race condition problem that occurs during checkout when multiple customers compete for the same limited stock.

Live URL: [TODO: Add Vercel URL after deployment]

---

## The Problem

In any ecommerce platform, there is a gap between when a customer clicks "Buy Now" and when the payment actually completes. This gap can be several minutes long, especially with 3DS flows, UPI confirmations, or wallet redirects.

If we decrement stock only when payment succeeds, two customers can pay for the same physical unit. One gets a refund, the other gets a bad experience, and the operations team has to clean up manually. On the other hand, if we decrement stock when the user adds to cart, inventory looks depleted even though most carts are abandoned, and conversion drops.

The solution is a temporary reservation. When a customer proceeds to checkout, we hold the units for 10 minutes. If payment succeeds, the reservation is confirmed and stock is permanently deducted. If payment fails or the timer expires, the hold is released and those units become available again.

---

## How to Run Locally

### Prerequisites

- Node.js 20 or higher
- npm
- A PostgreSQL database on Supabase or Neon (free tier works)
- An Upstash Redis instance (optional, needed for the idempotency bonus)

### Step 1: Install Dependencies

```bash
cd inventory-system
npm install
```

### Step 2: Set Up Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

You need to set the following variables in `.env`:

```
DATABASE_URL - Your Supabase/Neon pooled connection string (port 6543 for Supabase)
DIRECT_URL - Your Supabase/Neon direct connection string (port 5432 for Supabase)
REDIS_URL - Your Upstash Redis REST URL
REDIS_TOKEN - Your Upstash Redis REST token
NEXT_PUBLIC_APP_URL - http://localhost:3000 for local development
```

For Supabase, go to Settings then Database in your project dashboard. Copy the connection strings from there. The pooled connection goes into DATABASE_URL and the direct connection goes into DIRECT_URL.

For Upstash, create a Redis database at upstash.com and copy the REST URL and REST Token.

### Step 3: Set Up the Database

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

The first command generates the TypeScript client from the schema. The second creates all the tables in your database. The third populates it with sample products, warehouses, and inventory data.

### Step 4: Start the Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Step 5: Run Tests (Optional)

With the dev server running in another terminal:

```bash
npx tsx tests/api-test.ts
npx tsx tests/concurrency-test.ts
```

The API test verifies the complete reservation lifecycle. The concurrency test fires multiple simultaneous requests for the last unit and verifies that exactly one succeeds.

---

## How Concurrency Safety Works

This is the core of the system and the part I spent the most time thinking about.

### The Race Condition

Consider this scenario: there is 1 unit left in stock. User A and User B both hit the reserve button at the same time. Both read available stock as 1. Both create reservations. Now we have 2 reservations for 1 physical unit. This is overselling.

### The Solution: Row-Level Locking with SELECT FOR UPDATE

I use Prisma interactive transactions with PostgreSQL row-level locking. Here is what happens when a reservation request comes in:

1. We start a database transaction with Serializable isolation level.
2. Inside the transaction, we execute `SELECT ... FOR UPDATE` on the inventory row for that product-warehouse combination. This acquires an exclusive lock on that specific row.
3. Any other transaction that tries to read the same row will block and wait until our transaction completes.
4. We calculate available stock (totalUnits minus reservedUnits) using the locked row data.
5. If there is not enough stock, we throw a 409 error and the transaction rolls back.
6. If there is enough stock, we increment reservedUnits and create the reservation record.
7. When the transaction commits, the lock is released and the next waiting transaction proceeds. But now it sees the updated reservedUnits value.

This guarantees that if there are N available units, exactly N reservation requests will succeed and all others will get a 409 Insufficient Stock error. No more, no less.

### Why Serializable Isolation

I chose Serializable isolation as an additional safety layer on top of the row-level locks. This is PostgreSQL's strictest isolation level. It prevents dirty reads, non-repeatable reads, phantom reads, and write skew anomalies. The tradeoff is slightly higher contention under extreme concurrent load, but for a reservation system where correctness matters more than throughput, this is the right choice.

The same locking pattern is used for confirming and releasing reservations. Every mutation that touches the inventory goes through a transaction with row-level locking.

---

## How Reservation Expiry Works

Reservations that are not confirmed within 10 minutes need to be automatically released so the stock becomes available again. I implemented two complementary strategies:

### Lazy Cleanup on Read

Whenever the API reads a reservation (for example, when the checkout page loads and calls GET /api/reservations/:id), it checks whether the reservation is still pending and whether the current time is past the expiresAt timestamp. If the reservation has expired, the system automatically releases it right there, returning the stock to the available pool before sending the response.

This handles the common case where a user opens the checkout page after their reservation has expired. They immediately see that it has been released rather than seeing a stale "Pending" status.

### Scheduled Cleanup via Vercel Cron

The lazy approach only cleans up reservations that someone actually looks at. Reservations that are abandoned (the user closes the tab and never comes back) would sit in the database as expired-but-pending forever. To handle this, I set up a cron job.

The file `vercel.json` contains a cron configuration that hits the endpoint `/api/internal/cleanup-expired-reservations` every minute. This endpoint queries all reservations where status is PENDING and expiresAt is in the past. For each one, it runs a release transaction (with the same locking pattern described above) to safely return the stock.

Each expired reservation is processed in its own transaction so that if one fails, the others still get cleaned up. The endpoint also re-checks the reservation status under a lock before releasing, which prevents double-release if the lazy cleanup and the cron job happen to process the same reservation at the same time.

In production on Vercel, the cron runs automatically. For local development, you can trigger it manually by hitting the endpoint with curl or your browser.

### Why Both Strategies

Neither strategy alone is sufficient. Lazy cleanup handles the interactive case well but misses abandoned reservations. Cron cleanup handles everything but runs on a schedule, so there can be a delay of up to one minute before stock is returned. Together, they cover all cases with minimal delay.

---

## How Idempotency Works (Bonus)

Network issues and timeouts can cause clients to retry requests. Without idempotency, a retry of a successful reservation would create a duplicate. The customer would end up holding twice the stock they intended.

The reservation endpoint supports an optional `Idempotency-Key` header. When a client sends a request with this header:

1. Before doing anything, the server checks Upstash Redis for a record with that key.
2. If a record exists, it means this request was already processed. The server returns the original response without executing the business logic again. It also sets an `X-Idempotency-Replay: true` header so the client knows this is a replay.
3. If no record exists, the server processes the request normally. After getting the result, it stores the response in Redis with a 24-hour TTL keyed by the idempotency key.
4. If Redis is unavailable (credentials not set, network issue), the idempotency check is skipped entirely. The system still works; it just loses the duplicate protection. This graceful degradation means Redis is not a hard dependency.

---

## Data Model

The schema has five tables:

**products** stores the product catalog with name, description, and price.

**warehouses** stores warehouse locations. Each warehouse has a name and a city.

**inventories** is the join table between products and warehouses. Each row represents the stock of one product at one warehouse. It has two key fields: totalUnits (the total physical stock) and reservedUnits (how many of those are currently held by pending reservations). The available stock at any point is totalUnits minus reservedUnits. There is a unique constraint on (productId, warehouseId) so each product can only have one inventory record per warehouse.

**reservations** tracks each reservation. It has a status field that can be PENDING, CONFIRMED, or RELEASED. It also has an expiresAt timestamp set to 10 minutes after creation. The confirmedAt and releasedAt fields record when the reservation was finalized. There are indexes on (status, expiresAt) to support the cron cleanup query efficiently, and on (productId, warehouseId) for lookups.

**idempotency_keys** stores processed request keys for the idempotency feature. In practice, I use Redis for this (faster lookups, automatic TTL), but the table exists as a fallback option.

### Stock Lifecycle

When a reservation is created: totalUnits stays the same, reservedUnits goes up. Available stock goes down.

When a reservation is confirmed (payment succeeded): both totalUnits and reservedUnits go down by the same amount. Available stock stays the same (the units were already "spoken for").

When a reservation is released (payment failed or expired): totalUnits stays the same, reservedUnits goes down. Available stock goes back up.

---

## API Endpoints

### GET /api/products

Returns all products with their warehouse-level stock information. Each product includes an array of warehouses showing the warehouse name, total units, reserved units, and available units.

### GET /api/warehouses

Returns all warehouses with their name and location.

### POST /api/reservations

Creates a new reservation. Expects a JSON body with productId, warehouseId, and quantity. All fields are validated with Zod.

Returns 201 on success with the reservation details. Returns 409 if there is not enough available stock. Returns 400 for validation errors. Supports the Idempotency-Key header.

### GET /api/reservations/:id

Returns the details of a single reservation including the product and warehouse information. If the reservation is pending and expired, it automatically releases it before returning (lazy cleanup).

### POST /api/reservations/:id/confirm

Confirms a pending reservation. This permanently deducts stock from the inventory. Returns 410 if the reservation has expired (and releases the stock). Returns 409 if the reservation has already been released.

### POST /api/reservations/:id/release

Releases a pending reservation, returning the stock to the available pool. This is called when the user cancels or when payment fails.

### POST /api/internal/cleanup-expired-reservations

Internal endpoint called by the Vercel Cron job every minute. Finds all expired pending reservations and releases them. Supports both GET and POST methods for flexibility with different cron providers.

---

## Tech Stack

- Next.js 16 with App Router for both the frontend and the API
- TypeScript throughout the entire codebase
- Prisma ORM for database access and schema management
- PostgreSQL hosted on Supabase as the primary database
- Upstash Redis for idempotency key storage
- Tailwind CSS v4 for styling
- shadcn/ui for the component library
- React Query (TanStack Query) for client-side data fetching and cache invalidation
- Zod for request validation on the API layer
- Sonner for toast notifications in the UI
- Lucide React for icons

---

## Frontend

The frontend has two main pages:

The products page shows all products in a card grid. Each card displays the product name, price, and a list of warehouses with their available stock. Users can select a warehouse, choose a quantity, and click Reserve. If the reservation succeeds, they are redirected to the checkout page. If stock is insufficient, they see a toast notification with the 409 error message.

The checkout page shows the reservation details including the product, warehouse, quantity, and price. There is a live countdown timer that ticks every second showing how much time is left before the reservation expires. Two buttons let the user confirm the purchase or cancel. After confirming or cancelling, the UI updates immediately without a page refresh (React Query invalidates the cache). If the user tries to confirm an expired reservation, they see a toast notification with the 410 error message.

---

## Project Structure

```
inventory-system/
  app/
    api/
      products/route.ts
      warehouses/route.ts
      reservations/
        route.ts
        [id]/
          route.ts
          confirm/route.ts
          release/route.ts
      internal/
        cleanup-expired-reservations/route.ts
    reservation/[id]/page.tsx
    page.tsx
    layout.tsx
    globals.css
  components/
    ui/                    (shadcn components)
    countdown-timer.tsx
    header.tsx
    product-card.tsx
    product-skeleton.tsx
    providers.tsx
  hooks/
    use-countdown.ts
  lib/
    api.ts                 (frontend fetch wrapper)
    errors.ts              (custom error classes)
    prisma.ts              (singleton Prisma client)
    redis.ts               (Upstash Redis client + idempotency)
    reservations.ts        (core business logic)
    utils.ts
    validators.ts          (Zod schemas)
  types/
    index.ts
  prisma/
    schema.prisma
    seed.ts
  tests/
    api-test.ts
    concurrency-test.ts
  vercel.json              (cron config)
```

---

## Deployment

Push the code to a public GitHub repository. Import the repo into Vercel. Add the environment variables (DATABASE_URL, DIRECT_URL, REDIS_URL, REDIS_TOKEN, NEXT_PUBLIC_APP_URL) in the Vercel dashboard. Deploy. The cron job defined in vercel.json will be picked up automatically.

Make sure the database is seeded before sharing the live URL. The seed script can be run locally against the hosted database since the connection strings point to Supabase.

---

## Tradeoffs and Things I Would Do Differently

**Serializable isolation vs Read Committed.** I chose Serializable for maximum safety, but it comes with higher contention under extreme load. In a real production system handling thousands of concurrent requests per second, I would benchmark both and consider using Read Committed with explicit advisory locks if Serializable becomes a bottleneck.

**SELECT FOR UPDATE vs optimistic locking.** I went with pessimistic locking because it is simpler to reason about and guarantees correctness. Optimistic locking with version numbers would have less contention but requires retry logic in the application layer, which adds complexity.

**10-minute TTL.** This is a reasonable default but in a real system it should be configurable per product or per payment method. UPI might need 5 minutes, card payments might need 15.

**Redis for idempotency vs database.** Redis is faster and has built-in TTL support, but it adds another infrastructure dependency. I designed it to fail gracefully so the system works without Redis, just without idempotency protection.

**No user authentication.** I skipped auth to focus on the core reservation logic. In production, reservations would be tied to user sessions and there would be rate limiting to prevent abuse.

**No real payment integration.** The confirm and release endpoints simulate what would happen after a payment gateway callback. In a real system, these would be called by webhooks from Stripe or Razorpay.

**Single-item reservations.** The current system reserves one product at a time. A real ecommerce platform would need cart-level reservations that atomically reserve multiple items across multiple warehouses.

**No WebSocket for real-time stock updates.** The product listing uses polling (React Query refetch). For a high-traffic product with rapidly changing stock, WebSocket or Server-Sent Events would give a better user experience.

---

## License

MIT
