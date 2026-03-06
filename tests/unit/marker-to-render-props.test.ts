import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";

// Mock fs before importing module
vi.mock("fs");

import { mapMarkersToRenderProps } from "../../src/compositor/marker-to-render-props.js";

const sampleMarkers = {
  scenes: [
    { id: 1, startMs: 0, endMs: 5000 },
    { id: 2, startMs: 5000, endMs: 10000 },
  ],
  markers: [
    { type: "zoom", startMs: 1000, endMs: 3000, x: 500, y: 300, scale: 1.8 },
    { type: "click", ms: 1500, x: 500, y: 300 },
    { type: "highlight", startMs: 6000, endMs: 8000, x: 100, y: 100, w: 200, h: 40 },
  ],
};

beforeEach(() => {
  vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
    const pathStr = String(p);
    if (pathStr.includes("markers.json")) return JSON.stringify(sampleMarkers);
    if (pathStr.includes("words")) return JSON.stringify({ words: [] });
    return "";
  });
  vi.mocked(fs.existsSync).mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mapMarkersToRenderProps", () => {
  it("converts scenes from ms to frames with correct IDs", () => {
    const result = mapMarkersToRenderProps("/test/markers.json", "/video.webm", "/audio.mp3");
    expect(result.scenes).toHaveLength(2);
    expect(result.scenes[0].id).toBe("scene-01");
    expect(result.scenes[0].startFrame).toBe(0); // 0ms → 0 frames
    expect(result.scenes[0].durationFrames).toBe(150); // 5000ms → 150 frames
    expect(result.scenes[1].id).toBe("scene-02");
  });

  it("converts click markers to ClickEvent with intro offset", () => {
    const result = mapMarkersToRenderProps("/test/markers.json", "/video.webm", "/audio.mp3");
    expect(result.clicks).toHaveLength(1);
    expect(result.clicks![0].x).toBe(500);
    expect(result.clicks![0].y).toBe(300);
    // 1500ms → 45 frames + 90 intro = 135
    expect(result.clicks![0].frame).toBe(135);
    expect(result.clicks![0].duration).toBe(30);
  });

  it("converts zoom markers with intro offset", () => {
    const result = mapMarkersToRenderProps("/test/markers.json", "/video.webm", "/audio.mp3");
    expect(result.zoomEvents).toHaveLength(1);
    // 1000ms → 30 frames + 90 intro = 120
    expect(result.zoomEvents[0].frame).toBe(120);
    expect(result.zoomEvents[0].scale).toBe(1.8);
    // duration: 2000ms → 60 frames
    expect(result.zoomEvents[0].duration).toBe(60);
  });

  it("converts highlight markers with intro offset", () => {
    const result = mapMarkersToRenderProps("/test/markers.json", "/video.webm", "/audio.mp3");
    expect(result.highlights).toHaveLength(1);
    // 6000ms → 180 frames + 90 intro = 270
    expect(result.highlights[0].startFrame).toBe(270);
    expect(result.highlights[0].w).toBe(200);
    expect(result.highlights[0].h).toBe(40);
  });

  it("calculates total duration including intro + outro", () => {
    const result = mapMarkersToRenderProps("/test/markers.json", "/video.webm", "/audio.mp3");
    // 10000ms content = 300 frames + 90 intro + 120 outro = 510
    expect(result.totalDurationFrames).toBe(510);
  });

  it("sets video and audio paths", () => {
    const result = mapMarkersToRenderProps("/test/markers.json", "/video.webm", "/audio.mp3");
    expect(result.audioPath).toBe("/audio.mp3");
    expect(result.scenes[0].videoPath).toBe("/video.webm");
  });
});
