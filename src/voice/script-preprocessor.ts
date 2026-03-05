// Strips [SCENE:XX] markers from script text and records their word-index positions.
// Clean text is passed to ElevenLabs TTS; marker positions are used for timestamp merging.

import { type PreprocessedScript, type SceneMarker } from "./types.js";

// Matches [SCENE:01], [SCENE:02], etc.
const SCENE_MARKER_REGEX = /\[SCENE:(\d+)\]/g;

/**
 * Count words in a string up to (but not including) the given char offset.
 * Words are whitespace-separated tokens.
 */
function countWordsUpTo(text: string, charOffset: number): number {
  const slice = text.slice(0, charOffset).trim();
  if (!slice) return 0;
  return slice.split(/\s+/).length;
}

/**
 * Preprocess a script string:
 *  - Extract all [SCENE:XX] markers
 *  - Record the word index each marker falls after (in the clean text)
 *  - Return clean text (markers removed) + ordered scene marker list
 */
export function preprocessScript(rawScript: string): PreprocessedScript {
  const sceneMarkers: SceneMarker[] = [];
  let cleanText = rawScript;

  // First pass: collect all markers and their positions in the ORIGINAL text,
  // then strip them one-by-one (right to left) to keep earlier offsets valid.
  const matches: Array<{ id: string; index: number; fullMatch: string }> = [];

  let match: RegExpExecArray | null;
  const regex = new RegExp(SCENE_MARKER_REGEX.source, "g");

  while ((match = regex.exec(rawScript)) !== null) {
    matches.push({
      id: `SCENE:${match[1]}`,
      index: match.index,
      fullMatch: match[0],
    });
  }

  // Build clean text by removing markers
  cleanText = rawScript.replace(SCENE_MARKER_REGEX, "").replace(/\s{2,}/g, " ").trim();

  // For each marker, determine word index in clean text.
  // We rebuild clean text up to each marker's position to count words.
  for (const m of matches) {
    // Get the text before this marker in the original script, then strip
    // any earlier markers to approximate the clean-text offset.
    let textBefore = rawScript.slice(0, m.index);
    textBefore = textBefore.replace(SCENE_MARKER_REGEX, "").replace(/\s{2,}/g, " ").trim();
    const afterWordIdx = countWordsUpTo(cleanText, textBefore.length);

    sceneMarkers.push({ id: m.id, afterWordIdx });
  }

  return { cleanText, sceneMarkers };
}
