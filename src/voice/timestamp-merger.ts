// Merges word-level timestamps with [SCENE:XX] marker positions
// to produce the final words_timestamps.json with scene boundaries.

import fs from "fs";
import path from "path";
import {
  type SceneMarker,
  type WordTimestamp,
  type SceneBoundary,
  type WordsTimestamps,
} from "./types.js";

/**
 * Merge word timestamps with scene marker positions from the
 * script preprocessor. Scene boundaries are derived by mapping each marker's
 * afterWordIdx to the corresponding word's start/end time.
 */
export function mergeTimestamps(
  words: WordTimestamp[],
  sceneMarkers: SceneMarker[]
): WordsTimestamps {
  if (words.length === 0) {
    return { words: [], scenes: [], total_duration: 0 };
  }

  const scenes: SceneBoundary[] = sceneMarkers.map((marker, i) => {
    const startIdx = marker.afterWordIdx;
    // End index: one before the next marker's afterWordIdx, or last word
    const nextMarker = sceneMarkers[i + 1];
    const endIdx = nextMarker ? nextMarker.afterWordIdx - 1 : words.length - 1;

    // Clamp to valid range
    const safeStart = Math.min(startIdx, words.length - 1);
    const safeEnd = Math.min(endIdx, words.length - 1);

    const startTime = words[safeStart]?.start ?? 0;
    const endTime = words[safeEnd]?.end ?? 0;

    return {
      id: marker.id,
      start_word_idx: safeStart,
      end_word_idx: safeEnd,
      start_time: startTime,
      end_time: endTime,
    };
  });

  const totalDuration = words[words.length - 1]?.end ?? 0;

  return { words, scenes, total_duration: totalDuration };
}

/**
 * Save the merged timestamps to a JSON file.
 * Creates parent directories if they do not exist.
 */
export function saveTimestamps(timestamps: WordsTimestamps, outputPath: string): void {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(timestamps, null, 2), "utf-8");
  console.log(`[timestamps] Saved → ${outputPath}`);
}
