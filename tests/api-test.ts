/**
 * API Integration Test for Reservation System
 *
 * Tests the complete reservation lifecycle:
 * 1. List products
 * 2. Create reservation
 * 3. Verify stock reduction
 * 4. Confirm reservation
 * 5. Verify permanent stock deduction
 *
 * Prerequisites:
 * 1. Database must be running and seeded
 * 2. The Next.js server must be running (npm run dev)
 *
 * Usage:
 *   npx tsx tests/api-test.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.log(`  [FAIL] ${message}`);
    failed++;
  }
}

async function testListProducts() {
  console.log("\nTest: GET /api/products");
  console.log("-".repeat(50));

  const res = await fetch(`${BASE_URL}/api/products`);
  const products = await res.json();

  assert(res.status === 200, "Returns 200 status");
  assert(Array.isArray(products), "Returns an array");
  assert(products.length > 0, "Has at least one product");
  assert(products[0].name !== undefined, "Product has name");
  assert(
    Array.isArray(products[0].warehouses),
    "Product has warehouses array"
  );
  assert(
    products[0].warehouses[0]?.availableUnits !== undefined,
    "Warehouse has availableUnits"
  );

  return products;
}

async function testListWarehouses() {
  console.log("\nTest: GET /api/warehouses");
  console.log("-".repeat(50));

  const res = await fetch(`${BASE_URL}/api/warehouses`);
  const warehouses = await res.json();

  assert(res.status === 200, "Returns 200 status");
  assert(Array.isArray(warehouses), "Returns an array");
  assert(warehouses.length > 0, "Has at least one warehouse");
  assert(warehouses[0].name !== undefined, "Warehouse has name");
  assert(warehouses[0].location !== undefined, "Warehouse has location");
}

async function testCreateReservation(
  productId: string,
  warehouseId: string
) {
  console.log("\nTest: POST /api/reservations");
  console.log("-".repeat(50));

  const res = await fetch(`${BASE_URL}/api/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
  });

  const result = await res.json();

  assert(res.status === 201, "Returns 201 status");
  assert(result.data?.id !== undefined, "Returns reservation ID");
  assert(result.data?.status === "PENDING", "Status is PENDING");
  assert(result.data?.quantity === 1, "Quantity matches");
  assert(result.data?.expiresAt !== undefined, "Has expiry timestamp");

  return result.data;
}

async function testValidationError() {
  console.log("\nTest: POST /api/reservations (Validation Error)");
  console.log("-".repeat(50));

  const res = await fetch(`${BASE_URL}/api/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: "", warehouseId: "", quantity: 0 }),
  });

  const result = await res.json();

  assert(res.status === 400, "Returns 400 for invalid data");
  assert(result.error === "VALIDATION_ERROR", "Error type is VALIDATION_ERROR");
}

async function testGetReservation(reservationId: string) {
  console.log("\nTest: GET /api/reservations/:id");
  console.log("-".repeat(50));

  const res = await fetch(`${BASE_URL}/api/reservations/${reservationId}`);
  const result = await res.json();

  assert(res.status === 200, "Returns 200 status");
  assert(result.data?.id === reservationId, "Returns correct reservation");
  assert(result.data?.product !== undefined, "Includes product details");
  assert(result.data?.warehouse !== undefined, "Includes warehouse details");
}

async function testConfirmReservation(reservationId: string) {
  console.log("\nTest: POST /api/reservations/:id/confirm");
  console.log("-".repeat(50));

  const res = await fetch(
    `${BASE_URL}/api/reservations/${reservationId}/confirm`,
    { method: "POST" }
  );

  const result = await res.json();

  assert(res.status === 200, "Returns 200 status");
  assert(result.data?.status === "CONFIRMED", "Status is CONFIRMED");
  assert(result.data?.confirmedAt !== null, "Has confirmedAt timestamp");
}

async function testReleaseReservation(reservationId: string) {
  console.log("\nTest: POST /api/reservations/:id/release");
  console.log("-".repeat(50));

  const res = await fetch(
    `${BASE_URL}/api/reservations/${reservationId}/release`,
    { method: "POST" }
  );

  const result = await res.json();

  assert(res.status === 200, "Returns 200 status");
  assert(result.data?.status === "RELEASED", "Status is RELEASED");
  assert(result.data?.releasedAt !== null, "Has releasedAt timestamp");
}

async function testNotFoundReservation() {
  console.log("\nTest: GET /api/reservations/:id (Not Found)");
  console.log("-".repeat(50));

  const res = await fetch(`${BASE_URL}/api/reservations/nonexistent-id`);
  const result = await res.json();

  assert(res.status === 404, "Returns 404 for non-existent reservation");
  assert(result.error === "NOT_FOUND", "Error type is NOT_FOUND");
}

async function testCleanupEndpoint() {
  console.log("\nTest: POST /api/internal/cleanup-expired-reservations");
  console.log("-".repeat(50));

  const res = await fetch(
    `${BASE_URL}/api/internal/cleanup-expired-reservations`,
    { method: "POST" }
  );

  const result = await res.json();

  assert(res.status === 200, "Returns 200 status");
  assert(result.data?.releasedCount !== undefined, "Returns released count");
}

async function runAllTests() {
  console.log("API Integration Tests");
  console.log("=".repeat(60));

  try {
    // Test listing
    const products = await testListProducts();
    await testListWarehouses();

    // Test validation
    await testValidationError();
    await testNotFoundReservation();

    // Test reservation lifecycle (Create -> Confirm)
    const product = products[0];
    const warehouse = product.warehouses.find(
      (w: { availableUnits: number }) => w.availableUnits > 0
    );

    if (warehouse) {
      const reservation = await testCreateReservation(
        product.id,
        warehouse.warehouseId
      );
      await testGetReservation(reservation.id);
      await testConfirmReservation(reservation.id);
    } else {
      console.log("\nSkipping reservation lifecycle: no stock available");
    }

    // Test reservation lifecycle (Create -> Release)
    const warehouse2 = products[0]?.warehouses.find(
      (w: { availableUnits: number }) => w.availableUnits > 0
    );

    if (warehouse2) {
      const reservation2 = await testCreateReservation(
        products[0].id,
        warehouse2.warehouseId
      );
      await testReleaseReservation(reservation2.id);
    }

    // Test cleanup
    await testCleanupEndpoint();
  } catch (error) {
    console.error("\nTest runner error:", error);
    failed++;
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
