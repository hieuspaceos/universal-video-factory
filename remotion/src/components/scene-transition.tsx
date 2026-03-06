import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

export type TransitionType =
  | "fade"
  | "slide-left"
  | "slide-right"
  | "zoom-in"
  | "zoom-out"
  | "blur-dissolve"
  | "none";

interface SceneTransitionProps {
  type: TransitionType;
  /** Transition duration in frames (default 15 = 0.5s at 30fps) */
  durationFrames: number;
  children: React.ReactNode;
}

const SPRING_CFG = { damping: 18, stiffness: 120 };

/**
 * Wraps scene content with entry transition animations.
 * Transition plays during the first `durationFrames` frames of this Sequence.
 * The outgoing scene simply holds its last frame — crossfade is handled by
 * overlapping Sequences in the composition.
 */
export const SceneTransition: React.FC<SceneTransitionProps> = ({
  type,
  durationFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  if (type === "none" || durationFrames <= 0) {
    return <>{children}</>;
  }

  // Progress 0→1 over the transition duration
  const progress = spring({
    fps,
    frame,
    config: SPRING_CFG,
    durationInFrames: durationFrames,
  });

  const linearProgress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const style: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    willChange: "transform, opacity, filter",
  };

  switch (type) {
    case "fade":
      style.opacity = linearProgress;
      break;

    case "slide-left":
      style.transform = `translateX(${(1 - progress) * width}px)`;
      break;

    case "slide-right":
      style.transform = `translateX(${-(1 - progress) * width}px)`;
      break;

    case "zoom-in":
      style.opacity = linearProgress;
      style.transform = `scale(${interpolate(progress, [0, 1], [0.85, 1])})`;
      style.transformOrigin = "center center";
      break;

    case "zoom-out":
      style.opacity = linearProgress;
      style.transform = `scale(${interpolate(progress, [0, 1], [1.15, 1])})`;
      style.transformOrigin = "center center";
      break;

    case "blur-dissolve":
      style.opacity = linearProgress;
      style.filter = `blur(${interpolate(linearProgress, [0, 1], [12, 0])}px)`;
      break;
  }

  return <div style={style}>{children}</div>;
};
