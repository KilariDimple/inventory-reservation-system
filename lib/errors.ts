import { NextResponse } from "next/server";
import type { ApiError } from "./validators";

// ─── Custom Error Classes ──────────────────────────────

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, "NOT_FOUND", `${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "INSUFFICIENT_STOCK", message);
    this.name = "ConflictError";
  }
}

export class GoneError extends AppError {
  constructor(message: string) {
    super(410, "RESERVATION_EXPIRED", message);
    this.name = "GoneError";
  }
}

// ─── Error Response Builder ────────────────────────────

export function errorResponse(
  statusCode: number,
  error: string,
  message: string,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error,
      message,
      statusCode,
      ...(details ? { details } : {}),
    },
    { status: statusCode }
  );
}

// ─── Centralized Error Handler ─────────────────────────

export function handleApiError(err: unknown): NextResponse<ApiError> {
  console.error("API Error:", err);

  if (err instanceof AppError) {
    return errorResponse(err.statusCode, err.error, err.message, err.details);
  }

  if (err instanceof Error) {
    return errorResponse(500, "INTERNAL_ERROR", err.message);
  }

  return errorResponse(500, "INTERNAL_ERROR", "An unexpected error occurred");
}
