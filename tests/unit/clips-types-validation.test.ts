// Unit tests for clip types Zod schema validation

import { describe, it, expect } from "vitest";
import {
  clipMetadataSchema,
  clipCatalogSchema,
  composeManifestSchema,
} from "../../src/clips/types.js";

describe("clipMetadataSchema", () => {
  const validClip = {
    id: "checkbox-test-123",
    actionType: "checkbox",
    description: "Check first checkbox",
    url: "https://example.com/checkboxes",
    videoPath: "data/clips/checkbox-test-123/clip.mp4",
    durationMs: 3000,
    viewportWidth: 1920,
    viewportHeight: 1080,
    fps: 30,
    clickX: 500,
    clickY: 300,
    tags: ["checkbox"],
    recordedAt: "2026-03-06T00:00:00.000Z",
  };

  it("accepts valid clip metadata", () => {
    expect(clipMetadataSchema.safeParse(validClip).success).toBe(true);
  });

  it("rejects invalid URL", () => {
    const result = clipMetadataSchema.safeParse({ ...validClip, url: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects negative durationMs", () => {
    const result = clipMetadataSchema.safeParse({ ...validClip, durationMs: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const { id, ...noId } = validClip;
    expect(clipMetadataSchema.safeParse(noId).success).toBe(false);
  });

  it("allows optional thumbnailPath", () => {
    const withThumb = { ...validClip, thumbnailPath: "thumb.png" };
    expect(clipMetadataSchema.safeParse(withThumb).success).toBe(true);
  });
});

describe("clipCatalogSchema", () => {
  it("accepts valid catalog", () => {
    const result = clipCatalogSchema.safeParse({ version: 1, clips: [] });
    expect(result.success).toBe(true);
  });

  it("rejects wrong version", () => {
    const result = clipCatalogSchema.safeParse({ version: 2, clips: [] });
    expect(result.success).toBe(false);
  });
});

describe("composeManifestSchema", () => {
  it("accepts valid manifest", () => {
    const result = composeManifestSchema.safeParse({
      clips: [
        { clipId: "checkbox-123", narration: "First, check a checkbox." },
        { clipId: "dropdown-456", narration: "Then select from dropdown." },
      ],
      title: "Demo",
      lang: "en",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty clips array", () => {
    const result = composeManifestSchema.safeParse({ clips: [] });
    expect(result.success).toBe(false);
  });

  it("rejects clip entry without narration", () => {
    const result = composeManifestSchema.safeParse({
      clips: [{ clipId: "checkbox-123" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts manifest with optional fields omitted", () => {
    const result = composeManifestSchema.safeParse({
      clips: [{ clipId: "test", narration: "hello" }],
    });
    expect(result.success).toBe(true);
  });
});
