import { describe, it, expect } from "vitest";
import { analyzeDwells } from "../../src/detection/dwell-analyzer.js";
import type { CursorEvent } from "../../src/recorder/recorder-types.js";

/** Helper: generate move events within a small area over time */
function makeDwell(cx: number, cy: number, startMs: number, count: number, intervalMs: number): CursorEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    type: "move" as const,
    x: cx + (i % 3) * 5, // slight jitter within radius
    y: cy + (i % 2) * 5,
    ms: startMs + i * intervalMs,
  }));
}

describe("analyzeDwells", () => {
  it("detects a dwell zone when cursor stays in area >1.5s", () => {
    // 40 moves over 2s in a ~10px area
    const events = makeDwell(300, 400, 1000, 40, 50);
    const highlights = analyzeDwells(events);

    expect(highlights).toHaveLength(1);
    expect(highlights[0].type).toBe("highlight");
    expect(highlights[0].startMs).toBe(1000);
    expect(highlights[0].x).toBeLessThanOrEqual(300);
    expect(highlights[0].y).toBeLessThanOrEqual(400);
    expect(highlights[0].w).toBeGreaterThan(0);
    expect(highlights[0].h).toBeGreaterThan(0);
  });

  it("ignores short dwells (<1.5s)", () => {
    // 10 moves over 0.5s — too short
    const events = makeDwell(300, 400, 1000, 10, 50);
    const highlights = analyzeDwells(events);
    expect(highlights).toHaveLength(0);
  });

  it("detects multiple dwell zones", () => {
    const dwell1 = makeDwell(100, 100, 0, 40, 50);       // 0-2000ms
    const move = [{ type: "move" as const, x: 800, y: 800, ms: 2100 }]; // break
    const dwell2 = makeDwell(500, 500, 3000, 40, 50);    // 3000-5000ms
    const events = [...dwell1, ...move, ...dwell2];

    const highlights = analyzeDwells(events);
    expect(highlights).toHaveLength(2);
  });

  it("returns empty for rapid mouse movement", () => {
    // Large position changes each time — no dwell
    const events: CursorEvent[] = Array.from({ length: 20 }, (_, i) => ({
      type: "move" as const,
      x: i * 100,
      y: i * 100,
      ms: i * 50,
    }));
    const highlights = analyzeDwells(events);
    expect(highlights).toHaveLength(0);
  });

  it("returns empty for fewer than 2 move events", () => {
    expect(analyzeDwells([])).toHaveLength(0);
    expect(analyzeDwells([{ type: "move", x: 0, y: 0, ms: 0 }])).toHaveLength(0);
  });
});
