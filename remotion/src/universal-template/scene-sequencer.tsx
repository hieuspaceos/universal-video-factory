import React from "react";
import { Sequence } from "remotion";
import { ScreenClip } from "../components/screen-clip";
import type { SceneProps } from "./props-schema";

interface SceneSequencerProps {
  scenes: SceneProps[];
  width: number;
  height: number;
}

/**
 * Sequences scene clips back-to-back using Remotion <Sequence>.
 * Each scene is placed at its startFrame with its durationFrames.
 * Gaps between scenes show a black background (no freeze frame needed
 * since OffthreadVideo handles its own last-frame behavior).
 */
export const SceneSequencer: React.FC<SceneSequencerProps> = ({
  scenes,
  width,
  height,
}) => {
  return (
    <>
      {scenes.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.startFrame}
          durationInFrames={scene.durationFrames}
          name={scene.id}
        >
          <ScreenClip scene={scene} width={width} height={height} />
        </Sequence>
      ))}
    </>
  );
};
