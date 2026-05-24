import { NextRequest, NextResponse } from "next/server";
import { createReservationSchema } from "@/lib/validators";
import { createReservation } from "@/lib/reservations";
import { handleApiError, errorResponse } from "@/lib/errors";
import {
  getIdempotencyRecord,
  setIdempotencyRecord,
} from "@/lib/redis";

// POST /api/reservations
// Creates a new reservation with concurrency-safe inventory locking

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ─── Zod Validation ──────────────────────────────────
    const parsed = createReservationSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        400,
        "VALIDATION_ERROR",
        "Invalid request body",
        parsed.error.flatten().fieldErrors
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;

    // ─── Idempotency Check ───────────────────────────────
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (idempotencyKey) {
      const existing = await getIdempotencyRecord(idempotencyKey);
      if (existing) {
        return NextResponse.json(JSON.parse(existing.body), {
          status: existing.statusCode,
          headers: { "X-Idempotency-Replay": "true" },
        });
      }
    }

    // ─── Create Reservation (Concurrency Safe) ──────────
    const reservation = await createReservation(
      productId,
      warehouseId,
      quantity
    );

    const responseBody = {
      data: reservation,
      message: "Reservation created successfully",
    };

    // ─── Store Idempotency Record ────────────────────────
    if (idempotencyKey) {
      await setIdempotencyRecord(
        idempotencyKey,
        201,
        JSON.stringify(responseBody)
      );
    }

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
