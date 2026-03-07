// Splits a single TTS audio file into per-scene audio files using ffmpeg.
// Uses scene boundary timestamps from mergeTimestamps() to determine split points.

import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import type { SceneBoundary, SceneAudioFile } from "./types.js";
import { createLogger } from "../utils/logger.js";

const execFileAsync = promisify(execFile);
const log = createLogger("voice");

/**
 * Split a single audio file into per-scene segments using ffmpeg.
 * Each scene gets its own MP3 file based on the scene boundary timestamps
 * computed during timestamp merging.
 */
export async function splitAudioByScenes(
  audioPath: string,
  scenes: SceneBoundary[],
  outputDir: string
): Promise<SceneAudioFile[]> {
  fs.mkdirSync(outputDir, { recursive: true });

  const results: SceneAudioFile[] = [];

  for (const scene of scenes) {
    const sceneNum = scene.id.replace("SCENE:", "");
    const outPath = path.join(outputDir, `scene-${sceneNum}.mp3`);
    const duration = scene.end_time - scene.start_time;

    if (duration <= 0) {
      log.info(`Skipping ${scene.id}: zero duration`);
      continue;
    }

    await execFileAsync("ffmpeg", [
      "-y",
      "-i", audioPath,
      "-ss", String(scene.start_time),
      "-to", String(scene.end_time),
      "-c:a", "libmp3lame",
      "-q:a", "2",
      outPath,
    ]);

    results.push({
      sceneId: scene.id,
      audioPath: outPath,
      durationSec: duration,
      originalStartSec: scene.start_time,
      originalEndSec: scene.end_time,
    });
  }

  log.info(`Split audio into ${results.length} scene file(s)`);
  return results;
}
