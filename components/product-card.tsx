"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MapPin,
  Package,
  Minus,
  Plus,
  ShoppingCart,
  AlertTriangle,
  Loader2,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import { createReservation } from "@/lib/api";
import type { ProductWithStock, WarehouseStock } from "@/types";

interface ProductCardProps {
  product: ProductWithStock;
  onReservationCreated?: () => void;
}

export function ProductCard({ product, onReservationCreated }: ProductCardProps) {
  const router = useRouter();
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<WarehouseStock | null>(
      product.warehouses.find((w) => w.availableUnits > 0) || null
    );
  const [quantity, setQuantity] = useState(1);
  const [isReserving, setIsReserving] = useState(false);

  const totalAvailable = product.warehouses.reduce(
    (sum, w) => sum + w.availableUnits,
    0
  );

  const maxQuantity = selectedWarehouse?.availableUnits || 0;

  const handleReserve = async () => {
    if (!selectedWarehouse) {
      toast.error("Please select a warehouse");
      return;
    }

    setIsReserving(true);
    try {
      const result = await createReservation({
        productId: product.id,
        warehouseId: selectedWarehouse.warehouseId,
        quantity,
      });

      toast.success("Reservation created!", {
        description: `${quantity} unit(s) reserved for 10 minutes.`,
      });

      onReservationCreated?.();
      router.push(`/reservation/${result.data.id}`);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      if (error.statusCode === 409) {
        toast.error("Insufficient stock", {
          description: error.message,
          icon: <AlertTriangle className="h-4 w-4" />,
        });
      } else {
        toast.error("Failed to create reservation", {
          description: error.message,
        });
      }
    } finally {
      setIsReserving(false);
    }
  };

  return (
    <Card className="group overflow-hidden">
      {/* Product Image Placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
        <Box className="h-16 w-16 text-slate-300 dark:text-slate-600 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" />
        {/* Stock Badge */}
        <div className="absolute top-3 right-3">
          <Badge
            variant={
              totalAvailable > 5
                ? "success"
                : totalAvailable > 0
                ? "warning"
                : "destructive"
            }
            className="shadow-sm"
          >
            {totalAvailable > 0
              ? `${totalAvailable} in stock`
              : "Out of stock"}
          </Badge>
        </div>
        {/* Price Tag */}
        <div className="absolute bottom-3 left-3">
          <div className="rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 shadow-sm">
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {formatPrice(product.price)}
            </span>
          </div>
        </div>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{product.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {product.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Warehouse Stock List */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Warehouse Availability
          </p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {product.warehouses.map((warehouse) => (
              <button
                key={warehouse.warehouseId}
                onClick={() => {
                  if (warehouse.availableUnits > 0) {
                    setSelectedWarehouse(warehouse);
                    setQuantity(1);
                  }
                }}
                disabled={warehouse.availableUnits === 0}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all duration-200 border ${
                  selectedWarehouse?.warehouseId === warehouse.warehouseId
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-500/20"
                    : warehouse.availableUnits === 0
                    ? "border-slate-100 bg-slate-50/50 opacity-50 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900/50"
                    : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-100/80 cursor-pointer dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-left">
                    {warehouse.warehouseName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-3 w-3 text-slate-400" />
                  <span
                    className={`text-xs font-bold ${
                      warehouse.availableUnits > 5
                        ? "text-emerald-600"
                        : warehouse.availableUnits > 0
                        ? "text-amber-600"
                        : "text-red-500"
                    }`}
                  >
                    {warehouse.availableUnits}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Quantity Selector */}
        {selectedWarehouse && selectedWarehouse.availableUnits > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Quantity
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center text-lg font-bold text-slate-900 dark:text-white">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() =>
                  setQuantity(Math.min(maxQuantity, quantity + 1))
                }
                disabled={quantity >= maxQuantity}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          size="lg"
          onClick={handleReserve}
          disabled={
            !selectedWarehouse ||
            totalAvailable === 0 ||
            isReserving
          }
        >
          {isReserving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Reserving...
            </>
          ) : totalAvailable === 0 ? (
            "Out of Stock"
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              Reserve {quantity} Unit{quantity > 1 ? "s" : ""}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
