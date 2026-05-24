import { NextResponse } from "next/server";
import { confirmReservation } from "@/lib/reservations";
import { handleApiError } from "@/lib/errors";

// POST /api/reservations/[id]/confirm
// Confirms a pending reservation, permanently deducting stock

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reservation = await confirmReservation(id);

    return NextResponse.json({
      data: reservation,
      message: "Reservation confirmed successfully. Stock permanently deducted.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
