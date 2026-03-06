// Action clips library types — clip metadata, catalog, compose manifest

import { z } from "zod";

// --- Zod schemas (used for CLI input validation) ---

export const clipMetadataSchema = z.object({
  id: z.string(),
  actionType: z.string(),
  description: z.string(),
  url: z.string().url(),
  videoPath: z.string(),
  thumbnailPath: z.string().optional(),
  durationMs: z.number().positive(),
  viewportWidth: z.number().int().positive(),
  viewportHeight: z.number().int().positive(),
  fps: z.number().int().positive(),
  clickX: z.number(),
  clickY: z.number(),
  tags: z.array(z.string()),
  recordedAt: z.string(),
});

export const clipCatalogSchema = z.object({
  version: z.literal(1),
  clips: z.array(clipMetadataSchema),
});

export const composeManifestEntrySchema = z.object({
  clipId: z.string(),
  narration: z.string(),
});

export const composeManifestSchema = z.object({
  clips: z.array(composeManifestEntrySchema).min(1),
  title: z.string().optional(),
  lang: z.string().optional(),
  voice: z.string().optional(),
  brand: z.string().optional(),
});

// --- TypeScript types ---

export type ClipMetadata = z.infer<typeof clipMetadataSchema>;
export type ClipCatalog = z.infer<typeof clipCatalogSchema>;
export type ComposeManifestEntry = z.infer<typeof composeManifestEntrySchema>;
export type ComposeManifest = z.infer<typeof composeManifestSchema>;
