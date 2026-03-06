// Detects cursor dwell zones — clusters of move events within a small radius over time
// Dwell = cursor stayed in ~50px area for >1.5s → user is focused there

import type { CursorEvent } from "../recorder/recorder-types.js";
import type { HighlightMarker } from "./detection-types.js";

const DWELL_RADIUS_PX = 50;
const DWELL_MIN_DURATION_MS = 1500;
const HIGHLIGHT_PADDING_PX = 30;

/** Detect dwell zones from move events and return highlight markers */
export function analyzeDwells(events: CursorEvent[]): HighlightMarker[] {
  const moves = events.filter((e) => e.type === "move");
  if (moves.length < 2) return [];

  const dwells: HighlightMarker[] = [];
  let clusterStart = 0;

  for (let i = 1; i < moves.length; i++) {
    const anchor = moves[clusterStart];
    const current = moves[i];
    const dist = Math.hypot(current.x - anchor.x, current.y - anchor.y);

    if (dist > DWELL_RADIUS_PX) {
      // Cursor left the cluster — check if dwell was long enough
      const duration = moves[i - 1].ms - anchor.ms;
      if (duration >= DWELL_MIN_DURATION_MS) {
        dwells.push(buildHighlight(moves.slice(clusterStart, i)));
      }
      clusterStart = i;
    }
  }

  // Check final cluster
  const lastDuration = moves[moves.length - 1].ms - moves[clusterStart].ms;
  if (lastDuration >= DWELL_MIN_DURATION_MS) {
    dwells.push(buildHighlight(moves.slice(clusterStart)));
  }

  return dwells;
}

/** Build a highlight marker from a cluster of move events */
function buildHighlight(cluster: CursorEvent[]): HighlightMarker {
  const xs = cluster.map((e) => e.x);
  const ys = cluster.map((e) => e.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    type: "highlight",
    startMs: cluster[0].ms,
    endMs: cluster[cluster.length - 1].ms,
    x: minX - HIGHLIGHT_PADDING_PX,
    y: minY - HIGHLIGHT_PADDING_PX,
    w: maxX - minX + HIGHLIGHT_PADDING_PX * 2,
    h: maxY - minY + HIGHLIGHT_PADDING_PX * 2,
  };
}
