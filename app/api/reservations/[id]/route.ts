import { NextResponse } from "next/server";
import { getReservationById } from "@/lib/reservations";
import { handleApiError } from "@/lib/errors";

// GET /api/reservations/[id]
// Returns a single reservation with product and warehouse details

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reservation = await getReservationById(id);

    return NextResponse.json({ data: reservation });
  } catch (error) {
    return handleApiError(error);
  }
}
