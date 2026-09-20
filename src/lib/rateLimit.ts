/**
 * Rate limiting behind a swappable store: in-memory for local/MVP,
 * Upstash Redis later, without touching route handlers.
 */

export interface RateLimitStore {
  /** Atomically increments `key`, setting the TTL when the key is new. Returns the new count. */
  incr(key: string, ttlSeconds: number): Promise<number>;
  /** Seconds until `key` resets; 0 when absent. */
  ttl(key: string): Promise<number>;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export type RateLimiter = (key: string) => Promise<RateLimitResult>;

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, { count: number; expiresAt: number }>();

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const now = Date.now();
    const hit = this.hits.get(key);
    if (!hit || hit.expiresAt <= now) {
      this.hits.set(key, { count: 1, expiresAt: now + ttlSeconds * 1000 });
      this.sweep(now);
      return 1;
    }
    hit.count += 1;
    return hit.count;
  }

  async ttl(key: string): Promise<number> {
    const hit = this.hits.get(key);
    if (!hit) {
      return 0;
    }
    return Math.max(0, Math.ceil((hit.expiresAt - Date.now()) / 1000));
  }

  /** Bound memory: drop expired entries once the map grows past a modest size. */
  private sweep(now: number) {
    if (this.hits.size < 10_000) {
      return;
    }
    for (const [key, hit] of this.hits) {
      if (hit.expiresAt <= now) {
        this.hits.delete(key);
      }
    }
  }
}

export function createRateLimiter(
  limit: number,
  windowSeconds: number,
  store: RateLimitStore = new InMemoryRateLimitStore(),
): RateLimiter {
  return async (key: string) => {
    const count = await store.incr(key, windowSeconds);
    const allowed = count <= limit;
    return {
      allowed,
      limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: allowed ? 0 : await store.ttl(key),
    };
  };
}

/** App-wide limiter for the login endpoint (SPEC.md §5.1). */
export const rateLimiter = createRateLimiter(
  Number(process.env.LOGIN_RATE_LIMIT ?? 5),
  Number(process.env.LOGIN_RATE_WINDOW_SECONDS ?? 60),
);
