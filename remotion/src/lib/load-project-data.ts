import * as fs from "fs";
import * as path from "path";
import { mapWordsToFrames, mapScenesToFrames } from "./timing-calculator";
import type { WordTimestamp, SceneTimestamp } from "./timing-calculator";
import { UniversalTemplatePropsSchema } from "../universal-template/props-schema";
import type { UniversalTemplateProps } from "../universal-template/props-schema";

// Shape of words_timestamps.json produced by WhisperX pipeline
interface WordsTimestampsFile {
  words: WordTimestamp[];
  scenes?: SceneMarker[];
}

interface SceneMarker {
  id: string;          // e.g. "scene-01"
  start: number;       // seconds
  end: number;         // seconds
}

// Shape of capture_metadata.json produced by capture engine
interface CaptureMetadata {
  projectDir: string;
  scenes: { id: string; videoFile: string; start: number; end: number }[];
  audioFile: string;
  totalDuration: number;
}

const FPS = 30;

/**
 * Load project data from projectDir and convert to Remotion InputProps.
 * Expects: projectDir/words_timestamps.json + projectDir/capture_metadata.json
 */
export function loadProjectData(projectDir: string): UniversalTemplateProps {
  const timestampsPath = path.join(projectDir, "words_timestamps.json");
  const metadataPath = path.join(projectDir, "capture_metadata.json");

  if (!fs.existsSync(timestampsPath)) {
    throw new Error(`Missing words_timestamps.json in ${projectDir}`);
  }
  if (!fs.existsSync(metadataPath)) {
    throw new Error(`Missing capture_metadata.json in ${projectDir}`);
  }

  const timestamps: WordsTimestampsFile = JSON.parse(
    fs.readFileSync(timestampsPath, "utf-8")
  );
  const metadata: CaptureMetadata = JSON.parse(
    fs.readFileSync(metadataPath, "utf-8")
  );

  const wordFrames = mapWordsToFrames(timestamps.words ?? [], FPS);

  const sceneTimestamps: SceneTimestamp[] = metadata.scenes.map((s) => ({
    id: s.id,
    videoPath: path.resolve(projectDir, s.videoFile),
    start: s.start,
    end: s.end,
  }));
  const sceneFrames = mapScenesToFrames(sceneTimestamps, FPS);

  const totalDurationFrames = Math.round(metadata.totalDuration * FPS);
  const audioPath = path.resolve(projectDir, metadata.audioFile);

  const raw = {
    scenes: sceneFrames,
    audioPath,
    words: wordFrames,
    fps: FPS,
    width: 1920,
    height: 1080,
    totalDurationFrames,
  };

  return UniversalTemplatePropsSchema.parse(raw);
}
