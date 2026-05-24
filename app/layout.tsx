import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "StockReserve — Inventory Reservation System",
  description:
    "Concurrency-safe inventory reservation system for multi-warehouse ecommerce. Reserve stock temporarily while completing payment.",
  keywords: [
    "inventory",
    "reservation",
    "ecommerce",
    "warehouse",
    "stock management",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 font-sans antialiased dark:bg-slate-950">
        <Providers>
          <Header />
          <main>{children}</main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
