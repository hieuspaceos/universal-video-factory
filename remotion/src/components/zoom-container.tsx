import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface ZoomEvent {
  /** Absolute frame when zoom starts */
  frame: number;
  /** Focus point X in pixels */
  x: number;
  /** Focus point Y in pixels */
  y: number;
  /** Target scale (clamped to max 2.0) */
  scale: number;
  /** How many frames to hold at target scale before zooming back out */
  duration: number;
}

interface ZoomContainerProps {
  zoomEvents: ZoomEvent[];
  children: React.ReactNode;
}

const MAX_SCALE = 2.0;
const SPRING_CFG = { damping: 20, stiffness: 120 };
// Frames for zoom-in and zoom-out spring animation
const TRANSITION_FRAMES = 15;
// Frames to smoothly pan origin between consecutive zoom events
const PAN_FRAMES = 20;

/**
 * Wraps scene content with continuous spring-animated zoom.
 *
 * Instead of zooming in/out per event, maintains a seamless zoom:
 *   - First event  : spring from 1.0 → target scale
 *   - Between events: stay zoomed, smoothly pan focus point
 *   - Last event   : spring back to 1.0 after hold
 *
 * This produces smooth, professional-looking video output.
 */
export const ZoomContainer: React.FC<ZoomContainerProps> = ({
  zoomEvents,
  children,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  let currentScale = 1.0;
  let originX = width / 2;
  let originY = height / 2;

  if (zoomEvents.length > 0) {
    const firstEvent = zoomEvents[0];
    const lastEvent = zoomEvents[zoomEvents.length - 1];

    // Overall zoom timeline: zoom in at first event, zoom out after last event
    const zoomInStart = firstEvent.frame;
    const zoomInEnd = zoomInStart + TRANSITION_FRAMES;
    const zoomOutStart = lastEvent.frame + lastEvent.duration;
    const zoomOutEnd = zoomOutStart + TRANSITION_FRAMES;

    // Find current active event's target scale
    let activeScale = Math.min(firstEvent.scale, MAX_SCALE);
    for (const event of zoomEvents) {
      if (frame >= event.frame) {
        activeScale = Math.min(event.scale, MAX_SCALE);
      }
    }

    if (frame >= zoomInStart && frame <= zoomOutEnd) {
      if (frame <= zoomInEnd) {
        // Zoom in phase (first event)
        const progress = spring({
          fps,
          frame: frame - zoomInStart,
          config: SPRING_CFG,
          durationInFrames: TRANSITION_FRAMES,
        });
        currentScale = 1.0 + (activeScale - 1.0) * progress;
      } else if (frame <= zoomOutStart) {
        // Holding zoom — continuous throughout all events
        currentScale = activeScale;
      } else {
        // Zoom out phase (after last event)
        const progress = spring({
          fps,
          frame: frame - zoomOutStart,
          config: SPRING_CFG,
          durationInFrames: TRANSITION_FRAMES,
        });
        currentScale = activeScale - (activeScale - 1.0) * progress;
      }
    }

    // Determine focus point — find latest active event and pan from previous
    for (let i = zoomEvents.length - 1; i >= 0; i--) {
      if (frame >= zoomEvents[i].frame) {
        if (i > 0) {
          const prev = zoomEvents[i - 1];
          const panProgress = interpolate(
            frame,
            [zoomEvents[i].frame, zoomEvents[i].frame + PAN_FRAMES],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          originX = prev.x + (zoomEvents[i].x - prev.x) * panProgress;
          originY = prev.y + (zoomEvents[i].y - prev.y) * panProgress;
        } else {
          originX = zoomEvents[i].x;
          originY = zoomEvents[i].y;
        }
        break;
      }
    }
  }

  // Translate so zoom origin stays visually anchored at focus point
  const tx = (width / 2 - originX) * (currentScale - 1);
  const ty = (height / 2 - originY) * (currentScale - 1);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        transformOrigin: "center center",
        transform: `scale(${currentScale}) translate(${tx / currentScale}px, ${ty / currentScale}px)`,
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
};
