"use client";

import { useState, useEffect, useCallback } from "react";
import { getTimeRemaining } from "@/lib/utils";

interface CountdownState {
  minutes: number;
  seconds: number;
  expired: boolean;
  total: number;
  percentage: number;
}

export function useCountdown(
  expiresAt: string | Date,
  totalDurationMs: number = 10 * 60 * 1000
): CountdownState {
  const [state, setState] = useState<CountdownState>(() => {
    const time = getTimeRemaining(expiresAt);
    return {
      ...time,
      percentage: Math.max(0, (time.total / totalDurationMs) * 100),
    };
  });

  const tick = useCallback(() => {
    const time = getTimeRemaining(expiresAt);
    setState({
      ...time,
      percentage: Math.max(0, (time.total / totalDurationMs) * 100),
    });
  }, [expiresAt, totalDurationMs]);

  useEffect(() => {
    tick(); // Initial tick
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  return state;
}
