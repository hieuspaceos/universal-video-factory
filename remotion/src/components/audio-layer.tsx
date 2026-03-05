import React from "react";
import { Audio } from "remotion";

interface AudioLayerProps {
  audioPath: string;
  volume?: number;
}

/**
 * Renders the voiceover audio track spanning the full composition.
 * Volume defaults to 1.0 (full). Adjust via props if needed.
 */
export const AudioLayer: React.FC<AudioLayerProps> = ({
  audioPath,
  volume = 1.0,
}) => {
  return <Audio src={audioPath} volume={volume} />;
};
