// Converts markers.json (ms-based) → Remotion-compatible render props (frame-based)
// Used by the human-assisted pipeline as an alternative to capture_metadata-based mapping

import * as fs from "fs";
import * as path from "path";
import type { MarkersFile } from "../detection/detection-types.js";
import { MarkersFileSchema } from "../detection/detection-types.js";
import type { SceneTiming, WordFrame, ClickEvent, RenderInputProps } from "./types.js";

const FPS = 30;
const INTRO_FRAMES = 90;

function msToFrames(ms: number): number {
  return Math.round((ms / 1000) * FPS);
}

export interface MarkerZoomEvent {
  frame: number;
  x: number;
  y: number;
  scale: number;
  duration: number;
}

export interface MarkerHighlightEvent {
  startFrame: number;
  durationFrames: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MarkerRenderProps extends RenderInputProps {
  zoomEvents: MarkerZoomEvent[];
  highlights: MarkerHighlightEvent[];
}

/** Load markers.json and convert to frame-based render props */
export function mapMarkersToRenderProps(
  markersPath: string,
  videoPath: string,
  audioPath: string,
  wordsPath?: string
): MarkerRenderProps {
  const markersRaw = JSON.parse(fs.readFileSync(markersPath, "utf-8"));
  const markers: MarkersFile = MarkersFileSchema.parse(markersRaw);

  // Scenes → frame-based, offset by intro
  const scenes: SceneTiming[] = markers.scenes.map((s) => ({
    id: `scene-${String(s.id).padStart(2, "0")}`,
    videoPath,
    startFrame: msToFrames(s.startMs),
    durationFrames: Math.max(1, msToFrames(s.endMs - s.startMs)),
  }));

  // Click markers → ClickEvent props (offset by intro)
  const clicks: ClickEvent[] = markers.markers
    .filter((m) => m.type === "click")
    .map((m) => ({
      x: m.x,
      y: m.y,
      frame: msToFrames(m.ms) + INTRO_FRAMES,
      duration: 30,
    }));

  // Zoom markers → ZoomEvent props (offset by intro)
  const zoomEvents: MarkerZoomEvent[] = markers.markers
    .filter((m) => m.type === "zoom")
    .map((m) => ({
      frame: msToFrames(m.startMs) + INTRO_FRAMES,
      x: m.x,
      y: m.y,
      scale: m.scale,
      duration: Math.max(1, msToFrames(m.endMs - m.startMs)),
    }));

  // Highlight markers → frame-based (offset by intro)
  const highlights: MarkerHighlightEvent[] = markers.markers
    .filter((m) => m.type === "highlight")
    .map((m) => ({
      startFrame: msToFrames(m.startMs) + INTRO_FRAMES,
      durationFrames: Math.max(1, msToFrames(m.endMs - m.startMs)),
      x: m.x,
      y: m.y,
      w: m.w,
      h: m.h,
    }));

  // Words timestamps (optional — may not exist yet if voice not generated)
  let words: WordFrame[] = [];
  if (wordsPath && fs.existsSync(wordsPath)) {
    const wordsRaw = JSON.parse(fs.readFileSync(wordsPath, "utf-8"));
    words = (wordsRaw.words ?? []).map((w: { word: string; start: number; end: number }) => ({
      word: w.word,
      startFrame: Math.round(w.start * FPS) + INTRO_FRAMES,
      endFrame: Math.round(w.end * FPS) + INTRO_FRAMES,
    }));
  }

  // Total duration = last scene end + outro
  const lastScene = markers.scenes[markers.scenes.length - 1];
  const contentFrames = lastScene ? msToFrames(lastScene.endMs) : 0;
  const OUTRO_FRAMES = 120;
  const totalDurationFrames = INTRO_FRAMES + contentFrames + OUTRO_FRAMES;

  return {
    scenes,
    audioPath,
    words,
    fps: FPS,
    width: 1920,
    height: 1080,
    totalDurationFrames,
    clicks,
    zoomEvents,
    highlights,
  };
}
