import React from "react";
import { OffthreadVideo, Sequence } from "remotion";
import type { SceneProps } from "../universal-template/props-schema";

interface ContinuousScreenProps {
  /** Path to the single continuous recording video (used when all scenes share one file) */
  videoPath: string;
  width: number;
  height: number;
  /** When provided, renders per-scene videos instead of one continuous video */
  scenes?: SceneProps[];
}

/**
 * Renders screen recordings. Two modes:
 * 1. Continuous mode (default): single video plays through (main pipeline)
 * 2. Multi-clip mode: each scene has its own video file (compose pipeline)
 *    Detected automatically when scenes have different videoPath values.
 */
export const ContinuousScreen: React.FC<ContinuousScreenProps> = ({
  videoPath,
  width,
  height,
  scenes,
}) => {
  // Check if scenes use multiple different video files (compose mode)
  const uniquePaths = scenes ? new Set(scenes.map((s) => s.videoPath)) : new Set();
  const isMultiClip = uniquePaths.size > 1;

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width,
    height,
    overflow: "hidden",
    backgroundColor: "#000",
  };

  const videoStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  };

  if (isMultiClip && scenes) {
    // Multi-clip mode: render each scene's video in its own Sequence
    return (
      <div style={containerStyle}>
        {scenes.map((scene, i) => (
          <Sequence
            key={`scene-${i}`}
            from={scene.startFrame}
            durationInFrames={scene.durationFrames}
            name={`clip-${scene.id}`}
          >
            <OffthreadVideo src={scene.videoPath} style={videoStyle} />
          </Sequence>
        ))}
      </div>
    );
  }

  // Continuous mode: single video plays through
  return (
    <div style={containerStyle}>
      <OffthreadVideo src={videoPath} style={videoStyle} />
    </div>
  );
};
