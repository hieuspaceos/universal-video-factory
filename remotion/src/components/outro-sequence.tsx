import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

interface BrandProps {
  name: string;
  logo?: string;
  colors: { primary: string; accent: string };
  tagline?: string;
}

interface CtaProps {
  text: string;
  url: string;
}

interface OutroSequenceProps {
  brand?: BrandProps;
  cta?: CtaProps;
  duration: number;
}

const FPS = 30;
const SPRING_CFG = { damping: 18, stiffness: 140 };

/**
 * Outro animation — 120 frames (4s at 30fps).
 *
 * Timeline:
 *   0-15   : background fades in (scene → brand color)
 *   15-45  : CTA text slides up + fades in
 *   30-60  : brand logo fades in with spring scale
 *   45-90  : URL fades in
 *   90-120 : fade to black
 */
export const OutroSequence: React.FC<OutroSequenceProps> = ({
  brand,
  cta,
  duration,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const primaryColor = brand?.colors.primary ?? "#1a1a2e";
  const accentColor = brand?.colors.accent ?? "#FFD700";
  const brandName = brand?.name ?? "Video Factory";

  // Background fade in: 0-15
  const bgOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // CTA text: slide up + fade, 15-45
  const ctaProgress = interpolate(frame, [15, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaTranslateY = (1 - ctaProgress) * 40;

  // Logo: spring scale + fade, 30-60
  const logoProgress = spring({
    fps: FPS,
    frame: Math.max(0, frame - 30),
    config: SPRING_CFG,
    durationInFrames: 30,
  });
  const logoOpacity = interpolate(frame, [30, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // URL fade in: 45-90
  const urlOpacity = interpolate(frame, [45, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Final fade to black: 90-duration
  const fadeToBlack = interpolate(frame, [90, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ctaText = cta?.text ?? "Try it yourself";
  const ctaUrl = cta?.url ?? "";

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        overflow: "hidden",
      }}
    >
      {/* Brand background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: primaryColor,
          opacity: bgOpacity,
        }}
      />

      {/* Content layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          opacity: bgOpacity,
        }}
      >
        {/* CTA headline */}
        <div
          style={{
            opacity: ctaProgress,
            transform: `translateY(${ctaTranslateY}px)`,
            fontSize: 52,
            fontWeight: 700,
            color: "#FFFFFF",
            fontFamily: "system-ui, -apple-system, sans-serif",
            textAlign: "center",
            maxWidth: width * 0.75,
          }}
        >
          {ctaText}
        </div>

        {/* Brand logo */}
        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${0.6 + logoProgress * 0.4})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {brand?.logo ? (
            <img
              src={brand.logo}
              alt={brandName}
              style={{ height: 80, objectFit: "contain" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  backgroundColor: accentColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  fontWeight: 700,
                  color: primaryColor,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {brandName.charAt(0).toUpperCase()}
              </div>
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {brandName}
              </span>
            </div>
          )}
        </div>

        {/* URL */}
        {ctaUrl && (
          <div
            style={{
              opacity: urlOpacity,
              fontSize: 28,
              color: accentColor,
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: 500,
              letterSpacing: 1,
            }}
          >
            {ctaUrl}
          </div>
        )}
      </div>

      {/* Fade to black overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#000",
          opacity: fadeToBlack,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
