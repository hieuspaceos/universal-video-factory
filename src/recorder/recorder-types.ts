// Types for human screen recorder — cursor/click/scroll event tracking + scene markers

export interface CursorEvent {
  type: "move" | "click" | "scroll" | "key";
  x: number;
  y: number;
  ms: number;
  /** Only for click events */
  button?: "left" | "right";
  /** Only for scroll events */
  deltaY?: number;
  /** Only for key events */
  key?: string;
}

export interface SceneMarker {
  step: number;
  startMs: number;
  endMs: number;
}

export interface RecordingSession {
  recordedAt: string;
  url: string;
  durationMs: number;
  viewport: { width: number; height: number };
  scenes: SceneMarker[];
  events: CursorEvent[];
}

export interface RecordingResult {
  videoPath: string;
  eventsPath: string;
  thumbnailPath: string;
  durationMs: number;
  sceneCount: number;
}
