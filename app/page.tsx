"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  RefreshCw,
} from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { ProductGridSkeleton } from "@/components/product-skeleton";
import { Button } from "@/components/ui/button";
import { getProducts } from "@/lib/api";

export default function ProductsPage() {
  const {
    data: products,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2230%22%20height%3D%2230%22%20viewBox%3D%220%200%2030%2030%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1.22676%200C1.91374%200%202.45351%200.539773%202.45351%201.22676C2.45351%201.91374%201.91374%202.45351%201.22676%202.45351C0.539773%202.45351%200%201.91374%200%201.22676C0%200.539773%200.539773%200%201.22676%200Z%22%20fill%3D%22rgba(255%2C255%2C255%2C0.07)%22%2F%3E%3C%2Fsvg%3E')] opacity-50" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white/90 border border-white/10">
              <Sparkles className="h-4 w-4" />
              Multi-Warehouse Inventory System
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">
              Reserve Stock
              <br />
              <span className="bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">
                With Confidence
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-indigo-100/80">
              Concurrency-safe inventory reservations across multiple warehouses.
              Lock stock temporarily while you complete payment.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-2 text-sm text-white/90">
                <Shield className="h-4 w-4 text-emerald-300" />
                Concurrency Safe
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-2 text-sm text-white/90">
                <Zap className="h-4 w-4 text-amber-300" />
                10min Lock
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-2 text-sm text-white/90">
                <TrendingUp className="h-4 w-4 text-cyan-300" />
                Real-time Stock
              </div>
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent" />
      </section>

      {/* Products Grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
              <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Available Products
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {products
                  ? `${products.length} products across multiple warehouses`
                  : "Loading products..."}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && <ProductGridSkeleton />}

        {/* Error State */}
        {isError && (
          <div className="rounded-2xl border-2 border-dashed border-red-200 dark:border-red-800 p-12 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Package className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Failed to Load Products
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {(error as Error)?.message || "Something went wrong"}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {products && products.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Package className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No Products Available
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Check back later or run the seed command to populate products.
            </p>
          </div>
        )}

        {/* Product Grid */}
        {products && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onReservationCreated={() => refetch()}
              />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Package className="h-4 w-4" />
              StockReserve — Inventory Reservation System
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Built with Next.js, Prisma, PostgreSQL & Redis
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
