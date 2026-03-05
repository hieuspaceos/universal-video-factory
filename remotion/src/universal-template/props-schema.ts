import { z } from "zod";

// Zod schema for a single scene clip
const SceneSchema = z.object({
  id: z.string(),
  videoPath: z.string(),
  startFrame: z.number().int().nonnegative(),
  durationFrames: z.number().int().positive(),
});

// Zod schema for a single word timestamp
const WordSchema = z.object({
  word: z.string(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().nonnegative(),
});

// Main input props schema for UniversalTemplate
export const UniversalTemplatePropsSchema = z.object({
  scenes: z.array(SceneSchema),
  audioPath: z.string(),
  words: z.array(WordSchema),
  fps: z.number().positive().default(30),
  width: z.number().positive().default(1920),
  height: z.number().positive().default(1080),
  totalDurationFrames: z.number().int().positive(),
});

export type UniversalTemplateProps = z.infer<typeof UniversalTemplatePropsSchema>;
export type SceneProps = z.infer<typeof SceneSchema>;
export type WordProps = z.infer<typeof WordSchema>;
