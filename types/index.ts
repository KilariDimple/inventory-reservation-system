// ─── API Response Types ────────────────────────────────

export interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

export interface ProductWithStock {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  warehouses: WarehouseStock[];
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  createdAt: string;
}

export interface Reservation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, string[]>;
}
