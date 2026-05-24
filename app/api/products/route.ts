import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

// Mock data for frontend preview when database is unavailable
const MOCK_PRODUCTS = [
  {
    id: "mock-1", name: "iPhone 15 Pro Max",
    description: "Apple iPhone 15 Pro Max with A17 Pro chip, 256GB, Natural Titanium",
    price: 159900, imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    warehouses: [
      { warehouseId: "wh-1", warehouseName: "Mumbai Central Hub", warehouseLocation: "Mumbai, Maharashtra", totalUnits: 15, reservedUnits: 3, availableUnits: 12 },
      { warehouseId: "wh-2", warehouseName: "Delhi NCR Warehouse", warehouseLocation: "Gurugram, Haryana", totalUnits: 8, reservedUnits: 1, availableUnits: 7 },
      { warehouseId: "wh-3", warehouseName: "Bangalore Tech Park", warehouseLocation: "Whitefield, Bangalore", totalUnits: 20, reservedUnits: 5, availableUnits: 15 },
    ],
  },
  {
    id: "mock-2", name: "MacBook Air M3",
    description: "Apple MacBook Air 15-inch with M3 chip, 16GB RAM, 512GB SSD",
    price: 149900, imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    warehouses: [
      { warehouseId: "wh-1", warehouseName: "Mumbai Central Hub", warehouseLocation: "Mumbai, Maharashtra", totalUnits: 6, reservedUnits: 2, availableUnits: 4 },
      { warehouseId: "wh-3", warehouseName: "Bangalore Tech Park", warehouseLocation: "Whitefield, Bangalore", totalUnits: 10, reservedUnits: 0, availableUnits: 10 },
      { warehouseId: "wh-4", warehouseName: "Hyderabad Logistics Center", warehouseLocation: "Shamshabad, Hyderabad", totalUnits: 3, reservedUnits: 1, availableUnits: 2 },
    ],
  },
  {
    id: "mock-3", name: "Sony WH-1000XM5",
    description: "Premium noise-cancelling wireless headphones with 30hr battery life",
    price: 29990, imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    warehouses: [
      { warehouseId: "wh-1", warehouseName: "Mumbai Central Hub", warehouseLocation: "Mumbai, Maharashtra", totalUnits: 25, reservedUnits: 0, availableUnits: 25 },
      { warehouseId: "wh-2", warehouseName: "Delhi NCR Warehouse", warehouseLocation: "Gurugram, Haryana", totalUnits: 18, reservedUnits: 4, availableUnits: 14 },
    ],
  },
  {
    id: "mock-4", name: "Samsung Galaxy S24 Ultra",
    description: "Samsung Galaxy S24 Ultra with Snapdragon 8 Gen 3, 256GB, Titanium Gray",
    price: 129999, imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    warehouses: [
      { warehouseId: "wh-2", warehouseName: "Delhi NCR Warehouse", warehouseLocation: "Gurugram, Haryana", totalUnits: 12, reservedUnits: 3, availableUnits: 9 },
      { warehouseId: "wh-3", warehouseName: "Bangalore Tech Park", warehouseLocation: "Whitefield, Bangalore", totalUnits: 7, reservedUnits: 0, availableUnits: 7 },
      { warehouseId: "wh-4", warehouseName: "Hyderabad Logistics Center", warehouseLocation: "Shamshabad, Hyderabad", totalUnits: 1, reservedUnits: 1, availableUnits: 0 },
    ],
  },
  {
    id: "mock-5", name: "iPad Pro M4",
    description: "Apple iPad Pro 13-inch with M4 chip, Liquid Retina XDR display, 256GB",
    price: 119900, imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    warehouses: [
      { warehouseId: "wh-1", warehouseName: "Mumbai Central Hub", warehouseLocation: "Mumbai, Maharashtra", totalUnits: 9, reservedUnits: 2, availableUnits: 7 },
      { warehouseId: "wh-4", warehouseName: "Hyderabad Logistics Center", warehouseLocation: "Shamshabad, Hyderabad", totalUnits: 5, reservedUnits: 0, availableUnits: 5 },
    ],
  },
  {
    id: "mock-6", name: "AirPods Pro 2",
    description: "Apple AirPods Pro with USB-C, Active Noise Cancellation, Adaptive Audio",
    price: 24900, imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    warehouses: [
      { warehouseId: "wh-1", warehouseName: "Mumbai Central Hub", warehouseLocation: "Mumbai, Maharashtra", totalUnits: 30, reservedUnits: 5, availableUnits: 25 },
      { warehouseId: "wh-2", warehouseName: "Delhi NCR Warehouse", warehouseLocation: "Gurugram, Haryana", totalUnits: 22, reservedUnits: 0, availableUnits: 22 },
      { warehouseId: "wh-3", warehouseName: "Bangalore Tech Park", warehouseLocation: "Whitefield, Bangalore", totalUnits: 15, reservedUnits: 3, availableUnits: 12 },
      { warehouseId: "wh-4", warehouseName: "Hyderabad Logistics Center", warehouseLocation: "Shamshabad, Hyderabad", totalUnits: 10, reservedUnits: 0, availableUnits: 10 },
    ],
  },
];

// GET /api/products
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventory: {
          include: { warehouse: true },
          orderBy: { warehouse: { name: "asc" } },
        },
      },
      orderBy: { name: "asc" },
    });

    const response = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      warehouses: product.inventory.map((inv) => ({
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse.name,
        warehouseLocation: inv.warehouse.location,
        totalUnits: inv.totalUnits,
        reservedUnits: inv.reservedUnits,
        availableUnits: inv.totalUnits - inv.reservedUnits,
      })),
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.warn("Database unavailable, returning mock data:", (error as Error).message);
    return NextResponse.json(MOCK_PRODUCTS);
  }
}
