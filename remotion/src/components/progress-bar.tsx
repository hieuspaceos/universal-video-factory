import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface SceneTiming {
  startFrame: number;
  durationFrames: number;
}

interface ProgressBarProps {
  scenes: SceneTiming[];
  color?: string;
  height?: number;
}

/**
 * PiP progress bar — bottom of frame, full width.
 * Shows completion % based on current frame vs total scene duration.
 * Smooth interpolation between scene boundaries.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  scenes,
  color = "#2563EB",
  height = 4,
}) => {
  const frame = useCurrentFrame();

  if (scenes.length === 0) return null;

  const firstStart = scenes[0].startFrame;
  const lastScene = scenes[scenes.length - 1];
  const totalEnd = lastScene.startFrame + lastScene.durationFrames;
  const totalDuration = Math.max(1, totalEnd - firstStart);

  // Calculate progress as fraction of total content
  const progress = interpolate(
    frame,
    [firstStart, totalEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const fillWidth = `${(progress * 100).toFixed(2)}%`;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height,
        backgroundColor: "rgba(255,255,255,0.2)",
        zIndex: 100,
      }}
    >
      <div
        style={{
          height: "100%",
          width: fillWidth,
          backgroundColor: color,
          transition: "none",
        }}
      />
    </div>
  );
};
