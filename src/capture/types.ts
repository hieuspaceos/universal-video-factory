// Playwright capture engine types

import type { CursorEvent } from "../orchestrator/types.js";

export interface BrowserConfig {
  viewportWidth: number;
  viewportHeight: number;
  headless: boolean;
  /** Path to cookies JSON file for session injection */
  cookiesPath?: string;
  recordingFps: number;
  pageLoadTimeoutMs: number;
  clickActionTimeoutMs: number;
}

export interface RecordingSession {
  sceneIndex: number;
  outputPath: string;
  startedAt: number;
  endedAt?: number;
}

export interface SceneRecordingResult {
  sceneIndex: number;
  videoPath: string;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface CursorTrackerState {
  events: CursorEvent[];
  isTracking: boolean;
}

export interface CaptureMetadata {
  url: string;
  feature: string;
  capturedAt: string;
  viewportWidth: number;
  viewportHeight: number;
  fps: number;
  totalScenes: number;
  scenes: SceneMetadataEntry[];
  /** Relative path to voiceover audio file */
  audioFile?: string;
  /** Total audio duration in seconds */
  totalDuration?: number;
}

export interface SceneMetadataEntry {
  index: number;
  videoFile: string;
  durationMs: number;
  clickX: number;
  clickY: number;
  actionDescription: string;
  usedFallback: boolean;
  cursorEvents: CursorEvent[];
  /** Scene identifier from voice timestamps */
  id?: string;
  /** Scene start time in seconds (from voice alignment) */
  start?: number;
  /** Scene end time in seconds (from voice alignment) */
  end?: number;
}

export interface CookieEntry {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}
