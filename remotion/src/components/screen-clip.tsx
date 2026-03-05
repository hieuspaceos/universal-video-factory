import React from "react";
import { OffthreadVideo } from "remotion";
import type { SceneProps } from "../universal-template/props-schema";

interface ScreenClipProps {
  scene: SceneProps;
  width: number;
  height: number;
}

/**
 * Renders a single screen recording clip using OffthreadVideo.
 * Must be wrapped in a <Sequence> by the parent (scene-sequencer).
 * OffthreadVideo is preferred over Video for memory efficiency during render.
 */
export const ScreenClip: React.FC<ScreenClipProps> = ({ scene, width, height }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      <OffthreadVideo
        src={scene.videoPath}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
};
