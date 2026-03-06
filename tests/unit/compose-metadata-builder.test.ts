// Unit tests for compose-metadata-builder — clips + voice timing → capture metadata

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { buildComposeMetadata } from "../../src/clips/compose-metadata-builder.js";
import type { ClipMetadata } from "../../src/clips/types.js";
import type { VoicePipelineResult } from "../../src/voice/voice-pipeline.js";

function makeClip(index: number): ClipMetadata {
  return {
    id: `clip-${index}`,
    actionType: "checkbox",
    description: `Action ${index}`,
    url: "https://example.com",
    videoPath: `/tmp/clips/clip-${index}/clip.mp4`,
    durationMs: 3000,
    viewportWidth: 1920,
    viewportHeight: 1080,
    fps: 30,
    clickX: 100 * index,
    clickY: 200 * index,
    tags: ["test"],
    recordedAt: new Date().toISOString(),
  };
}

describe("buildComposeMetadata", () => {
  let tmpDir: string;
  let timestampsPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "compose-meta-"));
    timestampsPath = path.join(tmpDir, "words_timestamps.json");
    fs.writeFileSync(
      timestampsPath,
      JSON.stringify({
        scenes: [
          { id: "SCENE:01", start_time: 0, end_time: 3.5 },
          { id: "SCENE:02", start_time: 3.5, end_time: 7.0 },
        ],
        words: [],
        total_duration: 7.0,
      }),
      "utf-8"
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("builds metadata with correct scene count", () => {
    const clips = [makeClip(1), makeClip(2)];
    const voiceResult: VoicePipelineResult = {
      audioPath: path.join(tmpDir, "audio", "voiceover.mp3"),
      timestampsPath,
      totalDuration: 7.0,
      sceneDurations: [
        { id: "SCENE:01", durationSec: 3.5, startSec: 0 },
        { id: "SCENE:02", durationSec: 3.5, startSec: 3.5 },
      ],
    };

    const metadata = buildComposeMetadata(clips, voiceResult, tmpDir);

    expect(metadata.totalScenes).toBe(2);
    expect(metadata.scenes).toHaveLength(2);
  });

  it("maps scene start/end from voice timestamps", () => {
    const clips = [makeClip(1), makeClip(2)];
    const voiceResult: VoicePipelineResult = {
      audioPath: path.join(tmpDir, "audio", "voiceover.mp3"),
      timestampsPath,
      totalDuration: 7.0,
      sceneDurations: [
        { id: "SCENE:01", durationSec: 3.5, startSec: 0 },
        { id: "SCENE:02", durationSec: 3.5, startSec: 3.5 },
      ],
    };

    const metadata = buildComposeMetadata(clips, voiceResult, tmpDir);

    expect(metadata.scenes[0].start).toBe(0);
    expect(metadata.scenes[0].end).toBe(3.5);
    expect(metadata.scenes[1].start).toBe(3.5);
    expect(metadata.scenes[1].end).toBe(7.0);
  });

  it("preserves click coordinates from clips", () => {
    const clips = [makeClip(1)];
    const voiceResult: VoicePipelineResult = {
      audioPath: path.join(tmpDir, "audio", "voiceover.mp3"),
      timestampsPath,
      totalDuration: 3.5,
      sceneDurations: [{ id: "SCENE:01", durationSec: 3.5, startSec: 0 }],
    };

    const metadata = buildComposeMetadata(clips, voiceResult, tmpDir);

    expect(metadata.scenes[0].clickX).toBe(100);
    expect(metadata.scenes[0].clickY).toBe(200);
  });

  it("generates correct video file paths", () => {
    const clips = [makeClip(1), makeClip(2)];
    const voiceResult: VoicePipelineResult = {
      audioPath: path.join(tmpDir, "audio", "voiceover.mp3"),
      timestampsPath,
      totalDuration: 7.0,
      sceneDurations: [
        { id: "SCENE:01", durationSec: 3.5, startSec: 0 },
        { id: "SCENE:02", durationSec: 3.5, startSec: 3.5 },
      ],
    };

    const metadata = buildComposeMetadata(clips, voiceResult, tmpDir);

    expect(metadata.scenes[0].videoFile).toBe("scenes/scene-01.mp4");
    expect(metadata.scenes[1].videoFile).toBe("scenes/scene-02.mp4");
  });

  it("sets totalDuration from voice result", () => {
    const clips = [makeClip(1)];
    const voiceResult: VoicePipelineResult = {
      audioPath: path.join(tmpDir, "audio", "voiceover.mp3"),
      timestampsPath,
      totalDuration: 7.0,
      sceneDurations: [{ id: "SCENE:01", durationSec: 7.0, startSec: 0 }],
    };

    const metadata = buildComposeMetadata(clips, voiceResult, tmpDir);
    expect(metadata.totalDuration).toBe(7.0);
  });
});
