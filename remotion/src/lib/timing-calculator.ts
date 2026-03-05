// Timing calculator: convert between seconds and Remotion frame numbers

export interface WordTimestamp {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

export interface SceneTimestamp {
  id: string;
  videoPath: string;
  start: number; // seconds
  end: number;   // seconds
}

export interface WordFrame {
  word: string;
  startFrame: number;
  endFrame: number;
}

export interface SceneFrame {
  id: string;
  videoPath: string;
  startFrame: number;
  durationFrames: number;
}

/** Convert seconds to Remotion frame number */
export function secondsToFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

/** Convert Remotion frame number to seconds */
export function framesToSeconds(frame: number, fps: number): number {
  return frame / fps;
}

// Subtitle pacing: each word appears slightly before spoken (lead-in)
// and stays highlighted longer after (linger). Makes subtitles feel slower.
const SUBTITLE_LEAD_FRAMES = 3;   // show word ~100ms before spoken
const SUBTITLE_LINGER_FRAMES = 6; // keep highlighted ~200ms after spoken

/** Map word timestamps (seconds) to frame numbers.
 *  Adds lead-in and linger to each word so subtitles feel slower/smoother.
 *  Also fills inter-word gaps to prevent flickering. */
export function mapWordsToFrames(words: WordTimestamp[], fps: number): WordFrame[] {
  return words.map((w, i) => {
    const rawStart = secondsToFrames(w.start, fps);
    const startFrame = Math.max(0, rawStart - SUBTITLE_LEAD_FRAMES);
    // Extend end: natural end + linger, or next word's start (whichever is later)
    const naturalEnd = secondsToFrames(w.end, fps) + SUBTITLE_LINGER_FRAMES;
    const nextStart = i < words.length - 1
      ? secondsToFrames(words[i + 1].start, fps)
      : naturalEnd;
    return { word: w.word, startFrame, endFrame: Math.max(naturalEnd, nextStart) };
  });
}

/** Map scene timestamps (seconds) to frame numbers */
export function mapScenesToFrames(scenes: SceneTimestamp[], fps: number): SceneFrame[] {
  return scenes.map((s) => ({
    id: s.id,
    videoPath: s.videoPath,
    startFrame: secondsToFrames(s.start, fps),
    durationFrames: Math.max(1, secondsToFrames(s.end - s.start, fps)),
  }));
}

/** Find the current word index for a given frame */
export function findCurrentWordIndex(words: WordFrame[], frame: number): number {
  for (let i = 0; i < words.length; i++) {
    if (frame >= words[i].startFrame && frame <= words[i].endFrame) {
      return i;
    }
  }
  // Return last active word before current frame
  for (let i = words.length - 1; i >= 0; i--) {
    if (frame > words[i].endFrame) {
      return i;
    }
  }
  return -1;
}
