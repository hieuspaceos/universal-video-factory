// Meme planner — identifies meme/reaction insert points from script narration

export type MemeCategory = "success" | "surprise" | "frustration" | "thinking" | "celebration";

export interface MemeInsertPlan {
  /** Scene index where this meme should appear */
  sceneIndex: number;
  /** Frame offset within the scene (relative to scene start) */
  frameOffset: number;
  /** Meme category — used to pick a random asset from the library */
  category: MemeCategory;
  /** Display mode */
  mode: "pip" | "fullscreen";
  /** Duration in frames */
  durationFrames: number;
}

// Keyword patterns for detecting meme-worthy moments
const CATEGORY_RULES: { pattern: RegExp; category: MemeCategory }[] = [
  { pattern: /\b(done|success|works|complete|finish|perfect|great)\b/i, category: "success" },
  { pattern: /\b(wow|amazing|whoa|incredible|awesome|unexpected)\b/i, category: "surprise" },
  { pattern: /\b(error|fail|wrong|broken|issue|bug|oops)\b/i, category: "frustration" },
  { pattern: /\b(think|consider|hmm|wonder|question|decide)\b/i, category: "thinking" },
  { pattern: /\b(celebrate|congrat|hooray|yay|party|tada)\b/i, category: "celebration" },
];

const DEFAULT_DURATION_FRAMES = 45; // 1.5s at 30fps
const MIN_SCENE_GAP = 3; // at least 3 scenes apart between memes

/**
 * Analyzes script scenes and identifies points where meme inserts would enhance the video.
 * Conservative approach: max 1 meme per MIN_SCENE_GAP scenes to avoid feeling forced.
 */
export function planMemeInserts(
  scenes: { narration?: string; actionDescription?: string }[]
): MemeInsertPlan[] {
  const candidates: MemeInsertPlan[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const text = `${scenes[i].narration ?? ""} ${scenes[i].actionDescription ?? ""}`;

    for (const rule of CATEGORY_RULES) {
      if (rule.pattern.test(text)) {
        candidates.push({
          sceneIndex: i,
          frameOffset: 15, // appear slightly after scene starts
          category: rule.category,
          mode: "pip", // default to PiP — less intrusive
          durationFrames: DEFAULT_DURATION_FRAMES,
        });
        break; // one meme per scene max
      }
    }
  }

  // Enforce minimum gap between memes
  const filtered: MemeInsertPlan[] = [];
  let lastInsertScene = -MIN_SCENE_GAP;

  for (const candidate of candidates) {
    if (candidate.sceneIndex - lastInsertScene >= MIN_SCENE_GAP) {
      filtered.push(candidate);
      lastInsertScene = candidate.sceneIndex;
    }
  }

  return filtered;
}
