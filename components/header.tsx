"use client";

import Link from "next/link";
import {
  Package,
  Warehouse,
  ShoppingCart,
  Sparkles,
} from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/70 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-950/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/20 transition-transform duration-300 group-hover:scale-105">
            <Package className="h-5 w-5 text-white" />
            <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              StockReserve
            </span>
            <span className="text-[10px] font-medium text-slate-400 -mt-0.5 tracking-wider uppercase">
              Inventory System
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Products</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <Warehouse className="h-4 w-4" />
            <span className="hidden sm:inline">Warehouses</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
