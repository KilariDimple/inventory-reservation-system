"use client";

import { useCountdown } from "@/hooks/use-countdown";
import { Clock, AlertTriangle } from "lucide-react";

interface CountdownTimerProps {
  expiresAt: string;
  className?: string;
}

export function CountdownTimer({ expiresAt, className }: CountdownTimerProps) {
  const { minutes, seconds, expired, percentage } = useCountdown(expiresAt);

  if (expired) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-5 w-5 animate-pulse" />
          <span className="text-lg font-bold">Reservation Expired</span>
        </div>
        <div className="h-2 w-full rounded-full bg-red-100 dark:bg-red-900/30">
          <div className="h-full rounded-full bg-red-500 w-0 transition-all" />
        </div>
      </div>
    );
  }

  const isUrgent = percentage < 20;
  const isWarning = percentage < 50;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock
            className={`h-5 w-5 ${
              isUrgent
                ? "text-red-500 animate-pulse"
                : isWarning
                ? "text-amber-500"
                : "text-indigo-500"
            }`}
          />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Time Remaining
          </span>
        </div>
        <div
          className={`text-2xl font-mono font-bold tabular-nums ${
            isUrgent
              ? "text-red-600 dark:text-red-400"
              : isWarning
              ? "text-amber-600 dark:text-amber-400"
              : "text-indigo-600 dark:text-indigo-400"
          }`}
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            isUrgent
              ? "bg-gradient-to-r from-red-500 to-rose-500"
              : isWarning
              ? "bg-gradient-to-r from-amber-500 to-orange-500"
              : "bg-gradient-to-r from-indigo-500 to-purple-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {isUrgent && (
        <p className="text-xs text-red-500 font-medium animate-pulse">
          Less than 2 minutes remaining! Complete your purchase now.
        </p>
      )}
    </div>
  );
}
