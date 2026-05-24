import { prisma } from "@/lib/prisma";
import { Prisma, ReservationStatus } from "@prisma/client";
import { ConflictError, GoneError, NotFoundError } from "@/lib/errors";

const RESERVATION_TTL_MINUTES = 10;

// ─── Types ─────────────────────────────────────────────

export interface ReservationWithRelations {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: Date;
  confirmedAt: Date | null;
  releasedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
}

// ─── Create Reservation (CONCURRENCY SAFE) ─────────────
// Uses Prisma interactive transaction with SELECT ... FOR UPDATE
// to prevent race conditions on inventory rows.

export async function createReservation(
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<ReservationWithRelations> {
  return await prisma.$transaction(
    async (tx) => {
      // Step 1: Lock the inventory row with SELECT ... FOR UPDATE
      // This prevents concurrent reads from seeing stale data
      const inventoryRows = await tx.$queryRaw<
        Array<{
          id: string;
          totalUnits: number;
          reservedUnits: number;
        }>
      >`
        SELECT id, "totalUnits", "reservedUnits"
        FROM inventories
        WHERE "productId" = ${productId}
          AND "warehouseId" = ${warehouseId}
        FOR UPDATE
      `;

      if (inventoryRows.length === 0) {
        throw new NotFoundError(
          "Inventory record for this product/warehouse combination"
        );
      }

      const inventory = inventoryRows[0];

      // Step 2: Calculate available stock safely (under lock)
      const availableStock = inventory.totalUnits - inventory.reservedUnits;

      if (availableStock < quantity) {
        throw new ConflictError(
          `Insufficient stock. Only ${availableStock} unit(s) available, but ${quantity} requested.`
        );
      }

      // Step 3: Atomically increment reservedUnits
      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          reservedUnits: { increment: quantity },
        },
      });

      // Step 4: Create the reservation
      const expiresAt = new Date(
        Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000
      );

      const reservation = await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: ReservationStatus.PENDING,
          expiresAt,
        },
        include: {
          product: true,
          warehouse: true,
        },
      });

      return reservation;
    },
    {
      // Serializable isolation ensures maximum safety for concurrent access
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000, // 5s max wait to acquire transaction
      timeout: 10000, // 10s max transaction duration
    }
  );
}

// ─── Confirm Reservation ───────────────────────────────
// Permanently deducts stock when payment succeeds.

export async function confirmReservation(
  reservationId: string
): Promise<ReservationWithRelations> {
  return await prisma.$transaction(
    async (tx) => {
      // Lock the reservation row
      const reservationRows = await tx.$queryRaw<
        Array<{
          id: string;
          productId: string;
          warehouseId: string;
          quantity: number;
          status: ReservationStatus;
          expiresAt: Date;
        }>
      >`
        SELECT id, "productId", "warehouseId", quantity, status, "expiresAt"
        FROM reservations
        WHERE id = ${reservationId}
        FOR UPDATE
      `;

      if (reservationRows.length === 0) {
        throw new NotFoundError("Reservation");
      }

      const reservation = reservationRows[0];

      // Already confirmed? Return idempotently
      if (reservation.status === ReservationStatus.CONFIRMED) {
        return await tx.reservation.findUniqueOrThrow({
          where: { id: reservationId },
          include: { product: true, warehouse: true },
        });
      }

      // Already released?
      if (reservation.status === ReservationStatus.RELEASED) {
        throw new ConflictError(
          "This reservation has already been released/cancelled."
        );
      }

      // Check expiry
      if (new Date() > new Date(reservation.expiresAt)) {
        // Auto-release the expired reservation
        await releaseReservationInTx(
          tx,
          reservationId,
          reservation.productId,
          reservation.warehouseId,
          reservation.quantity
        );
        throw new GoneError(
          "Reservation has expired. Stock has been released back."
        );
      }

      // Lock the inventory row
      await tx.$queryRaw`
        SELECT id FROM inventories
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
        FOR UPDATE
      `;

      // Confirm: decrement both totalUnits and reservedUnits
      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: {
          totalUnits: { decrement: reservation.quantity },
          reservedUnits: { decrement: reservation.quantity },
        },
      });

      // Update reservation status
      const confirmed = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
        include: { product: true, warehouse: true },
      });

      return confirmed;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    }
  );
}

// ─── Release Reservation ───────────────────────────────
// Cancels a pending reservation, freeing up stock.

export async function releaseReservation(
  reservationId: string
): Promise<ReservationWithRelations> {
  return await prisma.$transaction(
    async (tx) => {
      // Lock the reservation row
      const reservationRows = await tx.$queryRaw<
        Array<{
          id: string;
          productId: string;
          warehouseId: string;
          quantity: number;
          status: ReservationStatus;
        }>
      >`
        SELECT id, "productId", "warehouseId", quantity, status
        FROM reservations
        WHERE id = ${reservationId}
        FOR UPDATE
      `;

      if (reservationRows.length === 0) {
        throw new NotFoundError("Reservation");
      }

      const reservation = reservationRows[0];

      // Already released?
      if (reservation.status === ReservationStatus.RELEASED) {
        return await tx.reservation.findUniqueOrThrow({
          where: { id: reservationId },
          include: { product: true, warehouse: true },
        });
      }

      // Already confirmed? Can't release
      if (reservation.status === ReservationStatus.CONFIRMED) {
        throw new ConflictError(
          "Cannot release a confirmed reservation. It has already been fulfilled."
        );
      }

      const released = await releaseReservationInTx(
        tx,
        reservationId,
        reservation.productId,
        reservation.warehouseId,
        reservation.quantity
      );

      return released;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    }
  );
}

// ─── Internal Release Helper ───────────────────────────

async function releaseReservationInTx(
  tx: Prisma.TransactionClient,
  reservationId: string,
  productId: string,
  warehouseId: string,
  quantity: number
): Promise<ReservationWithRelations> {
  // Lock and update inventory
  await tx.$queryRaw`
    SELECT id FROM inventories
    WHERE "productId" = ${productId}
      AND "warehouseId" = ${warehouseId}
    FOR UPDATE
  `;

  await tx.inventory.update({
    where: {
      productId_warehouseId: { productId, warehouseId },
    },
    data: {
      reservedUnits: { decrement: quantity },
    },
  });

  // Update reservation
  const released = await tx.reservation.update({
    where: { id: reservationId },
    data: {
      status: ReservationStatus.RELEASED,
      releasedAt: new Date(),
    },
    include: { product: true, warehouse: true },
  });

  return released;
}

// ─── Cleanup Expired Reservations ──────────────────────
// Finds all expired PENDING reservations and releases them.

export async function cleanupExpiredReservations(): Promise<{
  releasedCount: number;
  releasedIds: string[];
}> {
  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.PENDING,
      expiresAt: { lt: new Date() },
    },
    select: {
      id: true,
      productId: true,
      warehouseId: true,
      quantity: true,
    },
  });

  const releasedIds: string[] = [];

  for (const reservation of expiredReservations) {
    try {
      await prisma.$transaction(
        async (tx) => {
          // Re-check under lock to avoid double-release
          const current = await tx.$queryRaw<
            Array<{ id: string; status: ReservationStatus }>
          >`
            SELECT id, status FROM reservations
            WHERE id = ${reservation.id}
            FOR UPDATE
          `;

          if (
            current.length === 0 ||
            current[0].status !== ReservationStatus.PENDING
          ) {
            return; // Already processed
          }

          await releaseReservationInTx(
            tx,
            reservation.id,
            reservation.productId,
            reservation.warehouseId,
            reservation.quantity
          );

          releasedIds.push(reservation.id);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        }
      );
    } catch (err) {
      console.error(
        `Failed to release expired reservation ${reservation.id}:`,
        err
      );
    }
  }

  return {
    releasedCount: releasedIds.length,
    releasedIds,
  };
}

// ─── Get Reservation by ID ────────────────────────────

export async function getReservationById(
  id: string
): Promise<ReservationWithRelations> {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { product: true, warehouse: true },
  });

  if (!reservation) {
    throw new NotFoundError("Reservation");
  }

  // Lazy expiry check: if PENDING and expired, release it
  if (
    reservation.status === ReservationStatus.PENDING &&
    new Date() > reservation.expiresAt
  ) {
    try {
      return await releaseReservation(id);
    } catch {
      // If release fails (already released by cleanup), return as-is
      const refreshed = await prisma.reservation.findUnique({
        where: { id },
        include: { product: true, warehouse: true },
      });
      if (!refreshed) throw new NotFoundError("Reservation");
      return refreshed;
    }
  }

  return reservation;
}
