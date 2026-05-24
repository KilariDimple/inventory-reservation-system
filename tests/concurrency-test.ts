/**
 * Concurrency Test for Reservation System
 *
 * This script tests that the reservation system is safe under concurrent access.
 * It simulates the scenario where multiple users try to reserve the last unit simultaneously.
 *
 * Prerequisites:
 * 1. Database must be running and seeded
 * 2. The Next.js server must be running (npm run dev)
 * 3. Adjust BASE_URL if needed
 *
 * Usage:
 *   npx tsx tests/concurrency-test.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface ProductResponse {
  id: string;
  name: string;
  warehouses: Array<{
    warehouseId: string;
    warehouseName: string;
    totalUnits: number;
    reservedUnits: number;
    availableUnits: number;
  }>;
}

interface ReservationResponse {
  data: {
    id: string;
    quantity: number;
    status: string;
  };
  message: string;
}

async function getProducts(): Promise<ProductResponse[]> {
  const res = await fetch(`${BASE_URL}/api/products`);
  return res.json();
}

async function makeReservation(
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<{ success: boolean; status: number; data: unknown }> {
  try {
    const res = await fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, warehouseId, quantity }),
    });

    const data = await res.json();
    return { success: res.ok, status: res.status, data };
  } catch (error) {
    return { success: false, status: 500, data: error };
  }
}

async function runConcurrencyTest() {
  console.log("Starting Concurrency Test...\n");
  console.log("-".repeat(60));

  // Step 1: Get a product with stock
  const products = await getProducts();
  if (products.length === 0) {
    console.error("ERROR: No products found. Run seed first: npm run db:seed");
    process.exit(1);
  }

  const product = products[0];
  const warehouse = product.warehouses[0];

  if (!warehouse) {
    console.error("ERROR: No warehouse found for product");
    process.exit(1);
  }

  console.log(`\nProduct: ${product.name}`);
  console.log(`Warehouse: ${warehouse.warehouseName}`);
  console.log(`Available Stock: ${warehouse.availableUnits}`);
  console.log("");

  // Step 2: Try to reserve ALL available stock + 1 concurrently
  const numRequests = warehouse.availableUnits + 3; // More requests than available stock
  const quantity = 1;

  console.log(
    `Sending ${numRequests} concurrent reservation requests for ${quantity} unit each...`
  );
  console.log("-".repeat(60));

  const startTime = Date.now();

  // Fire all requests simultaneously
  const results = await Promise.all(
    Array.from({ length: numRequests }, (_, i) =>
      makeReservation(product.id, warehouse.warehouseId, quantity).then(
        (result) => ({
          requestIndex: i + 1,
          ...result,
        })
      )
    )
  );

  const duration = Date.now() - startTime;

  // Step 3: Analyze results
  const successes = results.filter((r) => r.success);
  const conflicts = results.filter((r) => r.status === 409);
  const errors = results.filter((r) => !r.success && r.status !== 409);

  console.log("\nResults:");
  console.log("-".repeat(60));
  console.log(`Successful reservations: ${successes.length}`);
  console.log(`Rejected (409 - No Stock): ${conflicts.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Total time: ${duration}ms`);
  console.log("");

  // Verify correctness
  if (successes.length <= warehouse.availableUnits) {
    console.log(
      "PASS: Number of successful reservations <= available stock"
    );
  } else {
    console.log(
      "FAIL: More reservations succeeded than available stock! RACE CONDITION DETECTED!"
    );
  }

  if (successes.length + conflicts.length === numRequests - errors.length) {
    console.log(
      "PASS: Every request either succeeded or got a proper 409 rejection"
    );
  } else {
    console.log("FAIL: Unexpected response distribution");
  }

  // Show individual results
  console.log("\nIndividual Request Results:");
  console.log("-".repeat(60));
  for (const result of results) {
    const icon = result.success ? "OK" : result.status === 409 ? "REJECTED" : "ERROR";
    console.log(
      `   [${icon}] Request #${result.requestIndex}: HTTP ${result.status}`
    );
  }

  // Step 4: Verify stock after test
  console.log("\nPost-test Stock Check:");
  console.log("-".repeat(60));
  const updatedProducts = await getProducts();
  const updatedProduct = updatedProducts.find((p) => p.id === product.id);
  const updatedWarehouse = updatedProduct?.warehouses.find(
    (w) => w.warehouseId === warehouse.warehouseId
  );

  if (updatedWarehouse) {
    console.log(`   Total Units: ${updatedWarehouse.totalUnits}`);
    console.log(`   Reserved: ${updatedWarehouse.reservedUnits}`);
    console.log(`   Available: ${updatedWarehouse.availableUnits}`);
    console.log(
      `   Expected Reserved: ${successes.length} (matching successful reservations)`
    );

    if (updatedWarehouse.reservedUnits === warehouse.reservedUnits + successes.length) {
      console.log("   PASS: Reserved units match successful reservation count");
    } else {
      console.log(
        "   FAIL: Reserved units don't match! Data inconsistency detected!"
      );
    }
  }

  console.log("\n" + "-".repeat(60));
  console.log("Concurrency test complete!\n");
}

runConcurrencyTest().catch(console.error);
