import React from "react";
import { useVideoConfig } from "remotion";
import { SceneSequencer } from "./scene-sequencer";
import { AudioLayer } from "../components/audio-layer";
import { KaraokeSubtitles } from "../components/karaoke-subtitles";
import type { UniversalTemplateProps } from "./props-schema";

/**
 * Universal composition: layers screen recordings, voiceover audio,
 * and karaoke subtitles into a single 1080p 30fps composition.
 *
 * Layer order (bottom to top):
 * 1. Black background
 * 2. Scene sequencer (screen clips)
 * 3. Audio layer (voiceover — no visual)
 * 4. Karaoke subtitles (overlay)
 */
export const UniversalComposition: React.FC<UniversalTemplateProps> = ({
  scenes,
  audioPath,
  words,
}) => {
  const { width, height } = useVideoConfig();

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        backgroundColor: "#000",
        overflow: "hidden",
      }}
    >
      {/* Layer 1: Screen recordings sequenced by timing */}
      <SceneSequencer scenes={scenes} width={width} height={height} />

      {/* Layer 2: Voiceover audio spanning full composition */}
      <AudioLayer audioPath={audioPath} />

      {/* Layer 3: Karaoke subtitle overlay */}
      <KaraokeSubtitles words={words} width={width} height={height} />
    </div>
  );
};
