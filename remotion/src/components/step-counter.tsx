import React from "react";
import { useCurrentFrame, spring, useVideoConfig } from "remotion";

interface SceneTiming {
  id: string;
  startFrame: number;
  durationFrames: number;
}

type BadgePosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

interface StepCounterProps {
  scenes: SceneTiming[];
  position?: BadgePosition;
}

const SPRING_CFG = { damping: 14, stiffness: 200 };
const MARGIN = 20;

function positionStyle(position: BadgePosition): React.CSSProperties {
  switch (position) {
    case "top-left":    return { top: MARGIN, left: MARGIN };
    case "bottom-right": return { bottom: MARGIN + 12, right: MARGIN };
    case "bottom-left":  return { bottom: MARGIN + 12, left: MARGIN };
    default:             return { top: MARGIN, right: MARGIN };
  }
}

/**
 * PiP step counter — "Step X of Y" pill badge.
 * Spring bounce animation fires on each scene change.
 */
export const StepCounter: React.FC<StepCounterProps> = ({
  scenes,
  position = "top-right",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (scenes.length === 0) return null;

  // Determine which scene we are in
  let currentStep = 1;
  for (let i = 0; i < scenes.length; i++) {
    if (frame >= scenes[i].startFrame) currentStep = i + 1;
  }

  const totalSteps = scenes.length;

  // Find the start frame of the current step for spring origin
  const stepStartFrame = scenes[currentStep - 1]?.startFrame ?? 0;
  const framesSinceStepStart = Math.max(0, frame - stepStartFrame);

  const scale = spring({
    fps,
    frame: framesSinceStepStart,
    config: SPRING_CFG,
    durationInFrames: 20,
    from: 0.6,
    to: 1,
  });

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyle(position),
        zIndex: 101,
        transform: `scale(${scale})`,
        transformOrigin:
          position === "top-right" ? "top right"
          : position === "top-left" ? "top left"
          : position === "bottom-right" ? "bottom right"
          : "bottom left",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0,0,0,0.65)",
          borderRadius: 24,
          paddingTop: 8,
          paddingBottom: 8,
          paddingLeft: 16,
          paddingRight: 16,
          color: "#FFFFFF",
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "system-ui, -apple-system, sans-serif",
          whiteSpace: "nowrap",
          backdropFilter: "blur(4px)",
        }}
      >
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
};
