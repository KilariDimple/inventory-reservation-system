import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

// GET /api/warehouses
// Returns all warehouses

export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(warehouses);
  } catch (error) {
    return handleApiError(error);
  }
}
