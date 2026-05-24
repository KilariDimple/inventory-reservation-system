import { Redis } from "@upstash/redis";

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  const token = process.env.REDIS_TOKEN;

  if (!url || !token) {
    console.warn(
      "Redis credentials not found. Idempotency and distributed locking disabled."
    );
    return null;
  }

  return new Redis({
    url,
    token,
  });
}

export const redis = createRedisClient();

// ─── Distributed Lock ──────────────────────────────────

export async function acquireLock(
  key: string,
  ttlMs: number = 10000
): Promise<string | null> {
  if (!redis) return `fallback-lock-${Date.now()}`;

  const lockId = `lock:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const acquired = await redis.set(key, lockId, {
    nx: true,
    px: ttlMs,
  });

  return acquired === "OK" ? lockId : null;
}

export async function releaseLock(
  key: string,
  lockId: string
): Promise<boolean> {
  if (!redis) return true;

  const currentValue = await redis.get(key);
  if (currentValue === lockId) {
    await redis.del(key);
    return true;
  }
  return false;
}

// ─── Idempotency via Redis ─────────────────────────────

interface IdempotencyRecord {
  statusCode: number;
  body: string;
}

export async function getIdempotencyRecord(
  key: string
): Promise<IdempotencyRecord | null> {
  if (!redis) return null;

  const record = await redis.get<IdempotencyRecord>(`idempotency:${key}`);
  return record;
}

export async function setIdempotencyRecord(
  key: string,
  statusCode: number,
  body: string,
  ttlSeconds: number = 86400 // 24 hours
): Promise<void> {
  if (!redis) return;

  await redis.set(
    `idempotency:${key}`,
    { statusCode, body },
    { ex: ttlSeconds }
  );
}
