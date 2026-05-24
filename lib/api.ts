const API_BASE = process.env.NEXT_PUBLIC_APP_URL || "";

async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || "An error occurred") as Error & {
      statusCode: number;
      errorType: string;
      details?: unknown;
    };
    error.statusCode = res.status;
    error.errorType = data.error;
    error.details = data.details;
    throw error;
  }

  return data;
}

// ─── Products API ──────────────────────────────────────

import type {
  ProductWithStock,
  ApiResponse,
  Reservation,
} from "@/types";

export async function getProducts(): Promise<ProductWithStock[]> {
  return fetchApi<ProductWithStock[]>("/api/products");
}

// ─── Reservations API ──────────────────────────────────

export async function createReservation(data: {
  productId: string;
  warehouseId: string;
  quantity: number;
}): Promise<ApiResponse<Reservation>> {
  return fetchApi<ApiResponse<Reservation>>("/api/reservations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getReservation(
  id: string
): Promise<ApiResponse<Reservation>> {
  return fetchApi<ApiResponse<Reservation>>(`/api/reservations/${id}`);
}

export async function confirmReservation(
  id: string
): Promise<ApiResponse<Reservation>> {
  return fetchApi<ApiResponse<Reservation>>(
    `/api/reservations/${id}/confirm`,
    { method: "POST" }
  );
}

export async function releaseReservation(
  id: string
): Promise<ApiResponse<Reservation>> {
  return fetchApi<ApiResponse<Reservation>>(
    `/api/reservations/${id}/release`,
    { method: "POST" }
  );
}

// ─── Warehouses API ────────────────────────────────────

import type { Warehouse } from "@/types";

export async function getWarehouses(): Promise<Warehouse[]> {
  return fetchApi<Warehouse[]>("/api/warehouses");
}
