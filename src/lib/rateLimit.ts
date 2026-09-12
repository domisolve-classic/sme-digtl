/**
 * Simple in-memory sliding-window rate limiter for the generation endpoint.
 *
 * KNOWN LIMITATION (documented in README): this is process-local state. On
 * a serverless platform with multiple instances, or after a redeploy, the
 * counter resets — so this bounds runaway cost from a single long-lived
 * process but is not a hard multi-instance guarantee. Swap for a Redis/
 * Upstash-backed counter before relying on this for real abuse prevention.
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 10;

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = Math.min(...timestamps);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: oldestInWindow + WINDOW_MS - now,
    };
  }

  timestamps.push(now);
  hits.set(key, timestamps);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - timestamps.length,
    retryAfterMs: 0,
  };
}
