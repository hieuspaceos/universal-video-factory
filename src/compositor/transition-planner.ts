// Transition planner — rule-based transition selection per scene boundary

export type TransitionType =
  | "fade"
  | "slide-left"
  | "slide-right"
  | "zoom-in"
  | "zoom-out"
  | "blur-dissolve"
  | "none";

export interface TransitionPlan {
  /** Index of the scene this transition leads INTO */
  sceneIndex: number;
  type: TransitionType;
  /** Duration in frames (default 15 = 0.5s at 30fps) */
  durationFrames: number;
}

// Keyword patterns mapped to transition types
const KEYWORD_RULES: { pattern: RegExp; type: TransitionType }[] = [
  { pattern: /\b(next step|moving on|then|now)\b/i, type: "slide-left" },
  { pattern: /\b(go back|previous|return)\b/i, type: "slide-right" },
  { pattern: /\b(look at|focus|zoom|closer|detail)\b/i, type: "zoom-in" },
  { pattern: /\b(overview|big picture|step back)\b/i, type: "zoom-out" },
  { pattern: /\b(finally|result|done|complete|finish)\b/i, type: "blur-dissolve" },
];

const DEFAULT_TRANSITION: TransitionType = "fade";
const DEFAULT_DURATION_FRAMES = 15; // 0.5s at 30fps

/**
 * Assigns a transition type for each scene boundary based on narration text.
 * Scene 0 (first scene) gets no transition — it starts immediately after intro.
 */
export function planTransitions(
  scenes: { narration?: string; actionDescription?: string }[]
): TransitionPlan[] {
  return scenes.map((scene, i) => {
    // First scene: no transition (intro handles the entry)
    if (i === 0) {
      return { sceneIndex: i, type: "none" as TransitionType, durationFrames: 0 };
    }

    const text = `${scene.narration ?? ""} ${scene.actionDescription ?? ""}`;
    const matched = KEYWORD_RULES.find((rule) => rule.pattern.test(text));

    return {
      sceneIndex: i,
      type: matched?.type ?? DEFAULT_TRANSITION,
      durationFrames: DEFAULT_DURATION_FRAMES,
    };
  });
}
