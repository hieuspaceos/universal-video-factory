// Unit tests for CatalogManager — CRUD operations on clip catalog

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { CatalogManager } from "../../src/clips/catalog-manager.js";
import type { ClipMetadata } from "../../src/clips/types.js";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "clips-test-"));
}

function makeClip(overrides: Partial<ClipMetadata> = {}): ClipMetadata {
  return {
    id: "checkbox-test-1234",
    actionType: "checkbox",
    description: "Check the first checkbox",
    url: "https://the-internet.herokuapp.com/checkboxes",
    videoPath: "/tmp/fake/clip.mp4",
    durationMs: 3000,
    viewportWidth: 1920,
    viewportHeight: 1080,
    fps: 30,
    clickX: 500,
    clickY: 300,
    tags: ["checkbox", "the-internet"],
    recordedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("CatalogManager", () => {
  let tmpDir: string;
  let catalog: CatalogManager;

  beforeEach(() => {
    tmpDir = makeTempDir();
    catalog = new CatalogManager(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("load returns empty catalog when file missing", () => {
    const result = catalog.load();
    expect(result).toEqual({ version: 1, clips: [] });
  });

  it("addClip persists clip to catalog", () => {
    const clip = makeClip();
    catalog.addClip(clip);

    const loaded = catalog.load();
    expect(loaded.clips).toHaveLength(1);
    expect(loaded.clips[0].id).toBe("checkbox-test-1234");
  });

  it("addClip replaces existing clip with same ID", () => {
    catalog.addClip(makeClip({ description: "v1" }));
    catalog.addClip(makeClip({ description: "v2" }));

    const loaded = catalog.load();
    expect(loaded.clips).toHaveLength(1);
    expect(loaded.clips[0].description).toBe("v2");
  });

  it("getClip returns clip by ID", () => {
    catalog.addClip(makeClip());
    const clip = catalog.getClip("checkbox-test-1234");
    expect(clip).not.toBeNull();
    expect(clip!.actionType).toBe("checkbox");
  });

  it("getClip returns null for unknown ID", () => {
    expect(catalog.getClip("nonexistent")).toBeNull();
  });

  it("removeClip deletes entry and returns true", () => {
    catalog.addClip(makeClip());
    // Create clip directory to test deletion
    const clipDir = path.join(tmpDir, "checkbox-test-1234");
    fs.mkdirSync(clipDir, { recursive: true });
    fs.writeFileSync(path.join(clipDir, "clip.mp4"), "fake");

    const removed = catalog.removeClip("checkbox-test-1234");
    expect(removed).toBe(true);
    expect(catalog.getClip("checkbox-test-1234")).toBeNull();
    expect(fs.existsSync(clipDir)).toBe(false);
  });

  it("removeClip returns false for unknown ID", () => {
    expect(catalog.removeClip("nonexistent")).toBe(false);
  });

  it("listClips returns all clips without filter", () => {
    catalog.addClip(makeClip({ id: "a" }));
    catalog.addClip(makeClip({ id: "b" }));
    expect(catalog.listClips()).toHaveLength(2);
  });

  it("listClips filters by actionType", () => {
    catalog.addClip(makeClip({ id: "a", actionType: "checkbox" }));
    catalog.addClip(makeClip({ id: "b", actionType: "dropdown" }));

    const result = catalog.listClips({ actionType: "checkbox" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("listClips filters by tags", () => {
    catalog.addClip(makeClip({ id: "a", tags: ["form", "input"] }));
    catalog.addClip(makeClip({ id: "b", tags: ["checkbox"] }));

    const result = catalog.listClips({ tags: ["form"] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("generateClipId produces expected format", () => {
    const id = catalog.generateClipId("checkbox", "https://the-internet.herokuapp.com/checkboxes");
    expect(id).toMatch(/^checkbox-the-internet-herokuapp-com-\d+$/);
  });

  it("getClipDir returns correct path", () => {
    const dir = catalog.getClipDir("my-clip-123");
    expect(dir).toBe(path.join(tmpDir, "my-clip-123"));
  });
});
