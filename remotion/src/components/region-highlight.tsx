// Region highlight — semi-transparent box overlay for dwell areas
// Fades in/out smoothly to draw attention without blocking content

import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface RegionHighlightProps {
  x: number;
  y: number;
  w: number;
  h: number;
  startFrame: number;
  durationFrames: number;
  color?: string;
}

const FADE_FRAMES = 10;

export const RegionHighlight: React.FC<RegionHighlightProps> = ({
  x,
  y,
  w,
  h,
  startFrame,
  durationFrames,
  color = "#FFD700",
}) => {
  const frame = useCurrentFrame();
  const rel = frame - startFrame;

  if (rel < 0 || rel > durationFrames) return null;

  // Fade in over first FADE_FRAMES, fade out over last FADE_FRAMES
  const opacity = interpolate(
    rel,
    [0, FADE_FRAMES, durationFrames - FADE_FRAMES, durationFrames],
    [0, 0.2, 0.2, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        backgroundColor: color,
        opacity,
        borderRadius: 6,
        border: `2px solid ${color}`,
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    />
  );
};
