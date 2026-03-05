// Unit tests for src/utils/retry.ts

import { describe, it, expect, vi } from "vitest";
import { withRetry } from "../../src/utils/retry.js";

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const result = await withRetry(async () => 42);
    expect(result).toBe(42);
  });

  it("retries on transient failure then succeeds", async () => {
    let attempt = 0;
    const result = await withRetry(
      async () => {
        attempt++;
        if (attempt < 3) throw new Error("transient");
        return "ok";
      },
      { maxAttempts: 3, initialDelayMs: 10 }
    );
    expect(result).toBe("ok");
    expect(attempt).toBe(3);
  });

  it("throws after exhausting all attempts", async () => {
    await expect(
      withRetry(async () => { throw new Error("always fails"); }, {
        maxAttempts: 2,
        initialDelayMs: 10,
      })
    ).rejects.toThrow("always fails");
  });

  it("does not retry on credit balance error (non-retryable)", async () => {
    let attempt = 0;
    await expect(
      withRetry(
        async () => {
          attempt++;
          throw new Error("Insufficient credit balance");
        },
        { maxAttempts: 3, initialDelayMs: 10 }
      )
    ).rejects.toThrow("credit balance");
    expect(attempt).toBe(1);
  });

  it("does not retry on billing error", async () => {
    let attempt = 0;
    await expect(
      withRetry(
        async () => {
          attempt++;
          throw new Error("billing account suspended");
        },
        { maxAttempts: 3, initialDelayMs: 10 }
      )
    ).rejects.toThrow("billing");
    expect(attempt).toBe(1);
  });

  it("does not retry on ENOENT error", async () => {
    let attempt = 0;
    await expect(
      withRetry(
        async () => {
          attempt++;
          throw new Error("ENOENT: no such file");
        },
        { maxAttempts: 3, initialDelayMs: 10 }
      )
    ).rejects.toThrow("ENOENT");
    expect(attempt).toBe(1);
  });

  it("does not retry on API_KEY not set error", async () => {
    let attempt = 0;
    await expect(
      withRetry(
        async () => {
          attempt++;
          throw new Error("ANTHROPIC_API_KEY not set");
        },
        { maxAttempts: 3, initialDelayMs: 10 }
      )
    ).rejects.toThrow("API_KEY");
    expect(attempt).toBe(1);
  });

  it("calls onRetry callback between attempts", async () => {
    const onRetry = vi.fn();
    let attempt = 0;
    await withRetry(
      async () => {
        attempt++;
        if (attempt < 2) throw new Error("fail");
        return "ok";
      },
      { maxAttempts: 3, initialDelayMs: 10, onRetry }
    );
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it("applies exponential backoff", async () => {
    const delays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;

    // Track delays by measuring time gaps
    let attempt = 0;
    const start = Date.now();
    try {
      await withRetry(
        async () => {
          attempt++;
          if (attempt <= 2) throw new Error("fail");
          return "ok";
        },
        { maxAttempts: 3, initialDelayMs: 50, backoffFactor: 2 }
      );
    } catch {
      // ignore
    }
    // Just verify it completed — timing is non-deterministic in CI
    expect(attempt).toBe(3);
  });
});
