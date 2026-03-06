import React from "react";
import { Sequence, OffthreadVideo } from "remotion";
import type { SceneProps } from "./props-schema";

interface SceneSequencerProps {
  scenes: SceneProps[];
  width: number;
  height: number;
}

/**
 * Sequences scene clips back-to-back using Remotion <Sequence>.
 * Each scene is placed at its startFrame with its durationFrames.
 * Used for multi-clip mode where each scene has its own video file.
 */
export const SceneSequencer: React.FC<SceneSequencerProps> = ({
  scenes,
  width,
  height,
}) => {
  const videoStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  };

  return (
    <>
      {scenes.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={scene.durationFrames}
          name={scene.id}
        >
          <OffthreadVideo src={scene.videoPath} style={videoStyle} />
        </Sequence>
      ))}
    </>
  );
};
