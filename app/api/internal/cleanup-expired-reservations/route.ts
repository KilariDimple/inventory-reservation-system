import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredReservations } from "@/lib/reservations";
import { handleApiError } from "@/lib/errors";

// POST /api/internal/cleanup-expired-reservations
// Cron-ready endpoint to clean up expired reservations
// Should be called periodically (e.g., every 1 minute via Vercel Cron)

export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await cleanupExpiredReservations();

    return NextResponse.json({
      message: `Cleanup complete. Released ${result.releasedCount} expired reservation(s).`,
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Also support GET for easy Vercel Cron trigger
export async function GET(request: NextRequest) {
  return POST(request);
}
