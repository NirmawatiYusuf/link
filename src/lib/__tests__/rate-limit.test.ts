import { describe, expect, it } from "vitest";
import { createRateLimiter, InMemoryRateLimitStore } from "../rateLimit";

describe("rate limiting", () => {
  it("allows requests up to the limit and blocks the rest", async () => {
    const limiter = createRateLimiter(5, 60, new InMemoryRateLimitStore());
    const results = await Promise.all(
      Array.from({ length: 7 }, () => limiter("ip-1")),
    );
    expect(results.slice(0, 5).every((result) => result.allowed)).toBe(true);
    expect(results.slice(5, 7).every((result) => result.allowed)).toBe(false);
    expect(results.slice(5, 7).every((result) => result.retryAfterSeconds > 0)).toBe(true);
  });

  it("tracks keys independently", async () => {
    const limiter = createRateLimiter(1, 60, new InMemoryRateLimitStore());
    await limiter("a");
    expect((await limiter("b")).allowed).toBe(true);
    expect((await limiter("a")).allowed).toBe(false);
  });

  it("resets after the window expires", async () => {
    const limiter = createRateLimiter(1, 1, new InMemoryRateLimitStore());
    await limiter("k");
    expect((await limiter("k")).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect((await limiter("k")).allowed).toBe(true);
  });
});
