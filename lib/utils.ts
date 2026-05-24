import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function getTimeRemaining(expiresAt: Date | string): {
  total: number;
  minutes: number;
  seconds: number;
  expired: boolean;
} {
  const total = new Date(expiresAt).getTime() - Date.now();
  const expired = total <= 0;

  return {
    total: Math.max(0, total),
    minutes: expired ? 0 : Math.floor((total / 1000 / 60) % 60),
    seconds: expired ? 0 : Math.floor((total / 1000) % 60),
    expired,
  };
}
