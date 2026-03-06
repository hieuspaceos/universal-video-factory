import { describe, it, expect } from "vitest";
import { generateClickZooms } from "../../src/detection/click-zoom-generator.js";
import type { CursorEvent } from "../../src/recorder/recorder-types.js";

describe("generateClickZooms", () => {
  it("generates zoom + click markers from click events", () => {
    const events: CursorEvent[] = [
      { type: "click", x: 100, y: 200, ms: 5000, button: "left" },
    ];
    const { zooms, clicks } = generateClickZooms(events);

    expect(clicks).toHaveLength(1);
    expect(clicks[0]).toEqual({ type: "click", ms: 5000, x: 100, y: 200 });

    expect(zooms).toHaveLength(1);
    expect(zooms[0]).toEqual({
      type: "zoom",
      startMs: 4500,
      endMs: 6500,
      x: 100,
      y: 200,
      scale: 1.8,
    });
  });

  it("clamps zoom startMs to 0 for early clicks", () => {
    const events: CursorEvent[] = [
      { type: "click", x: 50, y: 50, ms: 200, button: "left" },
    ];
    const { zooms } = generateClickZooms(events);
    expect(zooms[0].startMs).toBe(0);
  });

  it("merges overlapping zoom markers", () => {
    const events: CursorEvent[] = [
      { type: "click", x: 100, y: 200, ms: 1000, button: "left" },
      { type: "click", x: 120, y: 210, ms: 1800, button: "left" }, // overlaps with first
    ];
    const { zooms, clicks } = generateClickZooms(events);

    expect(clicks).toHaveLength(2);
    expect(zooms).toHaveLength(1); // merged
    expect(zooms[0].startMs).toBe(500);
    expect(zooms[0].endMs).toBe(3300);
  });

  it("keeps non-overlapping zooms separate", () => {
    const events: CursorEvent[] = [
      { type: "click", x: 100, y: 200, ms: 1000, button: "left" },
      { type: "click", x: 500, y: 400, ms: 10000, button: "left" },
    ];
    const { zooms } = generateClickZooms(events);
    expect(zooms).toHaveLength(2);
  });

  it("ignores non-click events", () => {
    const events: CursorEvent[] = [
      { type: "move", x: 100, y: 200, ms: 1000 },
      { type: "key", x: 0, y: 0, ms: 2000, key: "a" },
      { type: "scroll", x: 0, y: 100, ms: 3000, deltaY: 100 },
    ];
    const { zooms, clicks } = generateClickZooms(events);
    expect(zooms).toHaveLength(0);
    expect(clicks).toHaveLength(0);
  });

  it("returns empty for empty events", () => {
    const { zooms, clicks } = generateClickZooms([]);
    expect(zooms).toHaveLength(0);
    expect(clicks).toHaveLength(0);
  });
});
