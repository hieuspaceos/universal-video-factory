// Generates zoom + click markers from click events
// Zoom window: 500ms before click → 1500ms after click, 1.8x scale

import type { CursorEvent } from "../recorder/recorder-types.js";
import type { ZoomMarker, ClickMarker } from "./detection-types.js";

const ZOOM_LEAD_MS = 500;
const ZOOM_TRAIL_MS = 1500;
const DEFAULT_SCALE = 1.5;

export interface ClickZoomResult {
  zooms: ZoomMarker[];
  clicks: ClickMarker[];
}

/** Generate zoom and click markers from click events */
export function generateClickZooms(events: CursorEvent[]): ClickZoomResult {
  const clickEvents = events.filter((e) => e.type === "click");
  const zooms: ZoomMarker[] = [];
  const clicks: ClickMarker[] = [];

  for (const click of clickEvents) {
    clicks.push({ type: "click", ms: click.ms, x: click.x, y: click.y });
    zooms.push({
      type: "zoom",
      startMs: Math.max(0, click.ms - ZOOM_LEAD_MS),
      endMs: click.ms + ZOOM_TRAIL_MS,
      x: click.x,
      y: click.y,
      scale: DEFAULT_SCALE,
    });
  }

  return { zooms: mergeOverlappingZooms(zooms), clicks };
}

/** Merge overlapping zoom markers — keep the one closest to its click */
function mergeOverlappingZooms(zooms: ZoomMarker[]): ZoomMarker[] {
  if (zooms.length <= 1) return zooms;

  const sorted = [...zooms].sort((a, b) => a.startMs - b.startMs);
  const merged: ZoomMarker[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr.startMs <= prev.endMs) {
      // Overlapping — extend the previous marker to cover both
      prev.endMs = Math.max(prev.endMs, curr.endMs);
      // Use the midpoint of both zoom centers
      prev.x = Math.round((prev.x + curr.x) / 2);
      prev.y = Math.round((prev.y + curr.y) / 2);
    } else {
      merged.push(curr);
    }
  }

  return merged;
}
