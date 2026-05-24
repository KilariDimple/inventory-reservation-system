import { z } from "zod";

// ─── Reservation Schemas ───────────────────────────────

export const createReservationSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(100, "Quantity cannot exceed 100"),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

// ─── Product Schemas ───────────────────────────────────

export const productQuerySchema = z.object({
  search: z.string().optional(),
  warehouseId: z.string().optional(),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;

// ─── API Error Response ────────────────────────────────

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export interface ApiSuccess<T = unknown> {
  data: T;
  message?: string;
}
