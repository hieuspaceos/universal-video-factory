// Shared types and constants for the compositor module

// Default durations (frames at 30fps) — must match remotion/props-schema.ts defaults
export const DEFAULT_INTRO_FRAMES = 90;  // 3 seconds
export const DEFAULT_OUTRO_FRAMES = 120; // 4 seconds

export interface SceneTiming {
  id: string;          // e.g. "scene-01"
  videoPath: string;   // absolute path to scene-XX.mp4
  startFrame: number;  // frame number in final composition
  durationFrames: number;
  /** Per-scene audio path for voice sync (optional — falls back to single audio) */
  audioPath?: string;
}

export interface WordFrame {
  word: string;
  startFrame: number;
  endFrame: number;
}

/** Click event for Remotion click highlight + zoom */
export interface ClickEvent {
  x: number;
  y: number;
  frame: number;
  duration: number;
}

/** Full props passed to Remotion renderMedia as inputProps */
export interface RenderInputProps {
  scenes: SceneTiming[];
  audioPath: string;
  words: WordFrame[];
  fps: number;
  width: number;
  height: number;
  totalDurationFrames: number;
  clicks?: ClickEvent[];
}

export interface RenderOptions {
  projectDir: string;   // project output directory
  outputPath: string;   // destination MP4 path
  codec?: "h264" | "h265" | "vp8" | "vp9";
  concurrency?: number; // parallel render threads
  onProgress?: (progress: number) => void;
}

export interface RenderResult {
  outputPath: string;
  durationMs: number;
  framesRendered: number;
}
