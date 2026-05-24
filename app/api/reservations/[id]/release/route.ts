import { NextResponse } from "next/server";
import { releaseReservation } from "@/lib/reservations";
import { handleApiError } from "@/lib/errors";

// POST /api/reservations/[id]/release
// Releases (cancels) a pending reservation, freeing stock

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reservation = await releaseReservation(id);

    return NextResponse.json({
      data: reservation,
      message: "Reservation released successfully. Stock is now available.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
