import { describe, it, expect } from "vitest";
import { detectMarkers } from "../../src/detection/cursor-detector.js";
import type { RecordingSession } from "../../src/recorder/recorder-types.js";

function makeSession(overrides: Partial<RecordingSession> = {}): RecordingSession {
  return {
    recordedAt: "2026-01-01T00:00:00Z",
    url: "https://example.com",
    durationMs: 10000,
    viewport: { width: 1920, height: 1080 },
    scenes: [{ step: 1, startMs: 0, endMs: 10000 }],
    events: [],
    ...overrides,
  };
}

describe("detectMarkers", () => {
  it("maps scenes from recording", () => {
    const session = makeSession({
      scenes: [
        { step: 1, startMs: 0, endMs: 5000 },
        { step: 2, startMs: 5000, endMs: 10000 },
      ],
    });
    const result = detectMarkers(session);
    expect(result.scenes).toHaveLength(2);
    expect(result.scenes[0]).toEqual({ id: 1, startMs: 0, endMs: 5000 });
  });

  it("generates zoom + click markers from clicks", () => {
    const session = makeSession({
      events: [{ type: "click", x: 500, y: 300, ms: 3000, button: "left" }],
    });
    const result = detectMarkers(session);

    const zooms = result.markers.filter((m) => m.type === "zoom");
    const clicks = result.markers.filter((m) => m.type === "click");
    expect(zooms).toHaveLength(1);
    expect(clicks).toHaveLength(1);
  });

  it("generates highlight markers from dwell zones", () => {
    // 40 move events over 2s in same area, no clicks nearby
    const moves = Array.from({ length: 40 }, (_, i) => ({
      type: "move" as const,
      x: 200 + (i % 3) * 5,
      y: 200 + (i % 2) * 5,
      ms: 5000 + i * 50,
    }));
    const session = makeSession({ events: moves });
    const result = detectMarkers(session);

    const highlights = result.markers.filter((m) => m.type === "highlight");
    expect(highlights).toHaveLength(1);
  });

  it("filters highlights that overlap with zoom markers", () => {
    // Click at ms=5500 creates zoom [5000, 7000]
    // Dwell at 5000-7000ms overlaps → should be filtered
    const dwell = Array.from({ length: 40 }, (_, i) => ({
      type: "move" as const,
      x: 500 + (i % 3) * 5,
      y: 300 + (i % 2) * 5,
      ms: 5000 + i * 50,
    }));
    const click = { type: "click" as const, x: 500, y: 300, ms: 5500, button: "left" as const };
    const session = makeSession({ events: [...dwell, click] });
    const result = detectMarkers(session);

    const highlights = result.markers.filter((m) => m.type === "highlight");
    expect(highlights).toHaveLength(0); // filtered because zoom covers same time
  });

  it("returns valid MarkersFile schema", () => {
    const session = makeSession({
      events: [{ type: "click", x: 100, y: 100, ms: 1000, button: "left" }],
    });
    // detectMarkers runs Zod parse internally — would throw if invalid
    const result = detectMarkers(session);
    expect(result.scenes).toBeDefined();
    expect(result.markers).toBeDefined();
  });

  it("sorts markers by time", () => {
    const session = makeSession({
      events: [
        { type: "click", x: 800, y: 400, ms: 8000, button: "left" },
        { type: "click", x: 100, y: 100, ms: 1000, button: "left" },
      ],
    });
    const result = detectMarkers(session);
    const times = result.markers.map((m) => ("startMs" in m ? m.startMs : m.ms));
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    }
  });
});
