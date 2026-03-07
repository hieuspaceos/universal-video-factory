// Types for human-assisted tutorial script generation
// Input: URL + purpose → Output: step-by-step script for human to follow while recording

import { z } from "zod";

export const ScriptStepSchema = z.object({
  step: z.number().int().positive(),
  /** Clear instruction for human to follow (e.g. "Click the Login button") */
  instruction: z.string().min(1),
  /** Narration text for TTS voiceover */
  narration: z.string().min(1),
  /** Expected duration for this step in seconds */
  expectedDurationSec: z.number().positive(),
  /** Text to paste into input field — press C in terminal to copy to clipboard */
  pasteText: z.string().optional(),
});

export const TutorialScriptSchema = z.object({
  title: z.string().min(1),
  steps: z.array(ScriptStepSchema).min(1),
  totalExpectedDurationSec: z.number().positive(),
  lang: z.string().default("en"),
});

export type ScriptStep = z.infer<typeof ScriptStepSchema>;
export type TutorialScript = z.infer<typeof TutorialScriptSchema>;
