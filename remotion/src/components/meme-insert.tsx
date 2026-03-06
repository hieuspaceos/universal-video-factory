import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  Video,
} from "remotion";

export type MemeMode = "pip" | "fullscreen";

interface MemeInsertProps {
  /** Path to the meme asset (image or video) */
  src: string;
  mode: MemeMode;
  /** Duration in frames this meme is visible */
  durationFrames: number;
  /** Position for PiP mode */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

const SPRING_CFG = { damping: 14, stiffness: 160 };
const PIP_SIZE = 240; // pixels
const FADE_FRAMES = 6;

// PiP corner offsets
const POSITION_MAP = {
  "top-left": { top: 40, left: 40 },
  "top-right": { top: 40, right: 40 },
  "bottom-left": { bottom: 140, left: 40 },
  "bottom-right": { bottom: 140, right: 40 },
} as const;

/**
 * Renders a meme/reaction asset as either a PiP overlay or brief fullscreen takeover.
 *
 * PiP: small corner overlay with bounce-in + fade-out
 * Fullscreen: centered with fade in/out, semi-transparent dark backdrop
 */
export const MemeInsert: React.FC<MemeInsertProps> = ({
  src,
  mode,
  durationFrames,
  position = "bottom-right",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isVideo = /\.(mp4|webm|mov)$/i.test(src);

  // Fade out in last FADE_FRAMES
  const fadeOut = interpolate(
    frame,
    [durationFrames - FADE_FRAMES, durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  if (mode === "fullscreen") {
    // Fullscreen: centered with dark backdrop
    const fadeIn = interpolate(frame, [0, FADE_FRAMES], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const opacity = Math.min(fadeIn, fadeOut);

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: `rgba(0, 0, 0, ${opacity * 0.5})`,
          opacity,
        }}
      >
        {isVideo ? (
          <Video
            src={src}
            style={{ maxWidth: width * 0.6, maxHeight: height * 0.6, borderRadius: 12 }}
          />
        ) : (
          <Img
            src={src}
            style={{ maxWidth: width * 0.6, maxHeight: height * 0.6, borderRadius: 12 }}
          />
        )}
      </div>
    );
  }

  // PiP mode: bounce-in from scale 0 → 1
  const bounceProgress = spring({
    fps,
    frame,
    config: SPRING_CFG,
    durationInFrames: 10,
  });
  const scale = interpolate(bounceProgress, [0, 1], [0, 1]);
  const posStyle = POSITION_MAP[position];

  return (
    <div
      style={{
        position: "absolute",
        ...posStyle,
        width: PIP_SIZE,
        height: PIP_SIZE,
        borderRadius: 16,
        overflow: "hidden",
        transform: `scale(${scale})`,
        opacity: fadeOut,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        border: "3px solid rgba(255,255,255,0.2)",
      }}
    >
      {isVideo ? (
        <Video
          src={src}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Img
          src={src}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
    </div>
  );
};
