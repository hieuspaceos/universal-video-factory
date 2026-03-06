// Builds capture_metadata.json from clip metadata + voice pipeline timing.
// Produces the same format that scene-timing-mapper.ts expects, so existing
// Remotion composition works unchanged.

import * as fs from "fs";
import * as path from "path";
import type { ClipMetadata } from "./types.js";
import type { VoicePipelineResult } from "../voice/voice-pipeline.js";
import type { CaptureMetadata } from "../capture/types.js";

/**
 * Build capture_metadata.json from clips + voice timing, matching the format
 * consumed by scene-timing-mapper.ts for Remotion rendering.
 */
export function buildComposeMetadata(
  clips: ClipMetadata[],
  voiceResult: VoicePipelineResult,
  outputDir: string
): CaptureMetadata {
  const timestampsRaw = fs.readFileSync(voiceResult.timestampsPath, "utf-8");
  const timestamps = JSON.parse(timestampsRaw);

  const metadata: CaptureMetadata = {
    url: clips[0]?.url ?? "composed",
    feature: "composed-from-clips",
    capturedAt: new Date().toISOString(),
    viewportWidth: clips[0]?.viewportWidth ?? 1920,
    viewportHeight: clips[0]?.viewportHeight ?? 1080,
    fps: clips[0]?.fps ?? 30,
    totalScenes: clips.length,
    audioFile: path.relative(outputDir, voiceResult.audioPath),
    totalDuration: voiceResult.totalDuration,
    scenes: clips.map((clip, i) => {
      const boundary = timestamps.scenes?.[i];
      return {
        index: i + 1,
        id: boundary?.id ?? `SCENE:${String(i + 1).padStart(2, "0")}`,
        videoFile: `scenes/scene-${String(i + 1).padStart(2, "0")}.mp4`,
        durationMs: clip.durationMs,
        clickX: clip.clickX,
        clickY: clip.clickY,
        actionDescription: clip.description,
        usedFallback: false,
        cursorEvents: [],
        start: boundary?.start_time ?? 0,
        end: boundary?.end_time ?? voiceResult.totalDuration,
      };
    }),
  };

  return metadata;
}

/** Write capture_metadata.json to the output directory */
export function saveComposeMetadata(metadata: CaptureMetadata, outputDir: string): string {
  const metadataPath = path.join(outputDir, "capture_metadata.json");
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
  console.log(`[compose] Saved capture_metadata.json`);
  return metadataPath;
}
