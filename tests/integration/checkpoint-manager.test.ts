// Integration tests for src/orchestrator/checkpoint-manager.ts
// Tests save/load checkpoint state, phase completion tracking, resume behavior

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";
import {
  saveCheckpoint,
  loadCheckpoint,
  isPhaseComplete,
  getPhaseData,
} from "../../src/orchestrator/checkpoint-manager.js";
import type { Checkpoint, PipelinePhase } from "../../src/orchestrator/checkpoint-manager.js";

describe("checkpoint-manager integration", () => {
  let tmpDir: string;

  beforeEach(async () => {
    // Create temp directory for each test
    tmpDir = path.join(tmpdir(), `checkpoint-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory after each test
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("saveCheckpoint & loadCheckpoint", () => {
    it("saves a checkpoint and loads it back unchanged", async () => {
      const phase: PipelinePhase = "A";
      const data = { scriptPath: "/path/to/script.txt", elementCount: 42 };

      await saveCheckpoint(tmpDir, phase, data);
      const loaded = await loadCheckpoint(tmpDir);

      expect(loaded).toBeDefined();
      expect(loaded?.completedPhases).toHaveLength(1);
      expect(loaded?.completedPhases[0].phase).toBe("A");
      expect(loaded?.completedPhases[0].data).toEqual(data);
    });

    it("returns null when no checkpoint exists", async () => {
      const loaded = await loadCheckpoint(tmpDir);
      expect(loaded).toBeNull();
    });

    it("creates output directory if it doesn't exist", async () => {
      const newDir = path.join(tmpDir, "nested/path");
      await saveCheckpoint(newDir, "A", { test: true });

      const exists = await fs
        .stat(newDir)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it("preserves checkpoint version", async () => {
      await saveCheckpoint(tmpDir, "A", { data: "test" });
      const loaded = await loadCheckpoint(tmpDir);

      expect(loaded?.version).toBe(1);
    });

    it("records startedAt timestamp on first save", async () => {
      const beforeSave = new Date();
      await saveCheckpoint(tmpDir, "A", {});
      const afterSave = new Date();

      const loaded = await loadCheckpoint(tmpDir);
      const startedAt = new Date(loaded!.startedAt);

      expect(startedAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(startedAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
    });

    it("increments completedAt on phase re-run", async () => {
      await saveCheckpoint(tmpDir, "A", { attempt: 1 });
      const firstLoad = await loadCheckpoint(tmpDir);
      const firstTime = firstLoad!.completedPhases[0].completedAt;

      // Wait small delay then re-save same phase
      await new Promise((r) => setTimeout(r, 10));
      await saveCheckpoint(tmpDir, "A", { attempt: 2 });
      const secondLoad = await loadCheckpoint(tmpDir);

      expect(secondLoad?.completedPhases).toHaveLength(1);
      expect(secondLoad?.completedPhases[0].data).toEqual({ attempt: 2 });
      expect(
        new Date(secondLoad!.completedPhases[0].completedAt).getTime()
      ).toBeGreaterThan(new Date(firstTime).getTime());
    });
  });

  describe("multi-phase checkpoint tracking", () => {
    it("saves multiple phases sequentially", async () => {
      const phases: PipelinePhase[] = ["A", "B", "C", "D"];
      for (let i = 0; i < phases.length; i++) {
        await saveCheckpoint(tmpDir, phases[i], { phaseData: i });
      }

      const loaded = await loadCheckpoint(tmpDir);
      expect(loaded?.completedPhases).toHaveLength(4);
      expect(loaded?.completedPhases.map((p) => p.phase)).toEqual(phases);
    });

    it("maintains all phases when re-running middle phase", async () => {
      // Save A, B, C
      await saveCheckpoint(tmpDir, "A", { data: "a" });
      await saveCheckpoint(tmpDir, "B", { data: "b" });
      await saveCheckpoint(tmpDir, "C", { data: "c" });

      // Re-run phase B
      await saveCheckpoint(tmpDir, "B", { data: "b-updated" });

      const loaded = await loadCheckpoint(tmpDir);
      expect(loaded?.completedPhases).toHaveLength(3);
      // saveCheckpoint filters then pushes — re-saved B moves to end: A, C, B
      expect(loaded?.completedPhases[0].phase).toBe("A");
      expect(loaded?.completedPhases[1].phase).toBe("C");
      expect(loaded?.completedPhases[2].phase).toBe("B");
      expect(loaded?.completedPhases[2].data).toEqual({ data: "b-updated" });
    });

    it("handles E2E phase sequence (A→B→C→D→E)", async () => {
      const allPhases: PipelinePhase[] = ["A", "B", "C", "D", "E"];
      for (const phase of allPhases) {
        await saveCheckpoint(tmpDir, phase, {
          phaseName: phase,
          timestamp: Date.now(),
        });
      }

      const loaded = await loadCheckpoint(tmpDir);
      expect(loaded?.completedPhases.map((p) => p.phase)).toEqual(allPhases);
    });
  });

  describe("isPhaseComplete", () => {
    it("returns false when checkpoint is null", () => {
      expect(isPhaseComplete(null, "A")).toBe(false);
      expect(isPhaseComplete(null, "E")).toBe(false);
    });

    it("returns true for completed phase", async () => {
      await saveCheckpoint(tmpDir, "A", { test: true });
      const checkpoint = await loadCheckpoint(tmpDir);

      expect(isPhaseComplete(checkpoint, "A")).toBe(true);
    });

    it("returns false for non-completed phase", async () => {
      await saveCheckpoint(tmpDir, "A", {});
      const checkpoint = await loadCheckpoint(tmpDir);

      expect(isPhaseComplete(checkpoint, "B")).toBe(false);
      expect(isPhaseComplete(checkpoint, "C")).toBe(false);
    });

    it("returns correct status for mixed completed/incomplete phases", async () => {
      await saveCheckpoint(tmpDir, "A", {});
      await saveCheckpoint(tmpDir, "C", {});

      const checkpoint = await loadCheckpoint(tmpDir);
      expect(isPhaseComplete(checkpoint, "A")).toBe(true);
      expect(isPhaseComplete(checkpoint, "B")).toBe(false);
      expect(isPhaseComplete(checkpoint, "C")).toBe(true);
      expect(isPhaseComplete(checkpoint, "D")).toBe(false);
    });
  });

  describe("getPhaseData", () => {
    it("returns null when checkpoint is null", () => {
      expect(getPhaseData(null, "A")).toBeNull();
    });

    it("returns data for completed phase", async () => {
      const phaseData = {
        scriptPath: "/path/to/script.txt",
        clicks: 42,
        metadata: { foo: "bar" },
      };
      await saveCheckpoint(tmpDir, "A", phaseData);
      const checkpoint = await loadCheckpoint(tmpDir);

      const retrieved = getPhaseData(checkpoint, "A");
      expect(retrieved).toEqual(phaseData);
    });

    it("returns null for non-completed phase", async () => {
      await saveCheckpoint(tmpDir, "A", { data: "a" });
      const checkpoint = await loadCheckpoint(tmpDir);

      expect(getPhaseData(checkpoint, "B")).toBeNull();
      expect(getPhaseData(checkpoint, "E")).toBeNull();
    });

    it("retrieves correct data from multi-phase checkpoint", async () => {
      await saveCheckpoint(tmpDir, "A", { scriptPath: "/script.txt" });
      await saveCheckpoint(tmpDir, "B", {});
      await saveCheckpoint(tmpDir, "C", { draftPath: "/draft.mp4" });

      const checkpoint = await loadCheckpoint(tmpDir);
      expect(getPhaseData(checkpoint, "A")).toEqual({
        scriptPath: "/script.txt",
      });
      expect(getPhaseData(checkpoint, "B")).toEqual({});
      expect(getPhaseData(checkpoint, "C")).toEqual({ draftPath: "/draft.mp4" });
    });

    it("returns updated data after phase re-run", async () => {
      await saveCheckpoint(tmpDir, "A", { attempt: 1 });
      await saveCheckpoint(tmpDir, "A", { attempt: 2 });

      const checkpoint = await loadCheckpoint(tmpDir);
      expect(getPhaseData(checkpoint, "A")).toEqual({ attempt: 2 });
    });
  });

  describe("checkpoint file format & validity", () => {
    it("saves valid JSON that can be manually parsed", async () => {
      await saveCheckpoint(tmpDir, "A", { test: "data" });
      const checkpointPath = path.join(tmpDir, ".checkpoint.json");
      const raw = await fs.readFile(checkpointPath, "utf-8");
      const parsed = JSON.parse(raw);

      expect(parsed.version).toBe(1);
      expect(Array.isArray(parsed.completedPhases)).toBe(true);
      expect(parsed.startedAt).toBeTruthy();
      expect(parsed.outputDir).toBe(tmpDir);
    });

    it("returns null for corrupted checkpoint file", async () => {
      const checkpointPath = path.join(tmpDir, ".checkpoint.json");
      await fs.writeFile(checkpointPath, "invalid json {{{", "utf-8");

      const loaded = await loadCheckpoint(tmpDir);
      expect(loaded).toBeNull();
    });

    it("returns null when checkpoint has incompatible version", async () => {
      const checkpointPath = path.join(tmpDir, ".checkpoint.json");
      const invalid: Checkpoint = {
        version: 999,
        startedAt: new Date().toISOString(),
        outputDir: tmpDir,
        completedPhases: [],
      };
      await fs.writeFile(checkpointPath, JSON.stringify(invalid), "utf-8");

      const loaded = await loadCheckpoint(tmpDir);
      expect(loaded).toBeNull();
    });

    it("preserves complex nested data structures", async () => {
      const complexData = {
        scriptPath: "/path/to/script.txt",
        scenes: [
          {
            index: 0,
            duration: 5000,
            clicks: [{ x: 100, y: 200 }],
          },
          {
            index: 1,
            duration: 3000,
            clicks: [{ x: 300, y: 400 }],
          },
        ],
        metadata: {
          url: "https://example.com",
          feature: "Sign Up",
          nested: {
            level3: {
              value: "test",
            },
          },
        },
      };

      await saveCheckpoint(tmpDir, "A", complexData);
      const checkpoint = await loadCheckpoint(tmpDir);
      const retrieved = getPhaseData(checkpoint, "A");

      expect(retrieved).toEqual(complexData);
      expect(retrieved?.scenes).toHaveLength(2);
      expect(retrieved?.metadata.nested.level3.value).toBe("test");
    });
  });

  describe("checkpoint persistence & resume scenarios", () => {
    it("supports resume workflow: save A→B, load, verify B can skip", async () => {
      // Initial run: phases A and B complete
      await saveCheckpoint(tmpDir, "A", { scriptPath: "/script.txt" });
      await saveCheckpoint(tmpDir, "B", {});

      // Simulate resume: load checkpoint
      const checkpoint = await loadCheckpoint(tmpDir);

      // Verify can decide to skip B
      expect(isPhaseComplete(checkpoint, "A")).toBe(true);
      expect(isPhaseComplete(checkpoint, "B")).toBe(true);
      expect(isPhaseComplete(checkpoint, "C")).toBe(false);
    });

    it("checkpoint survives file system operations", async () => {
      await saveCheckpoint(tmpDir, "A", { test: "data1" });

      // Read it back (simulating separate process)
      const checkpoint1 = await loadCheckpoint(tmpDir);
      expect(getPhaseData(checkpoint1, "A")).toEqual({ test: "data1" });

      // Save more phases from "resume"
      await saveCheckpoint(tmpDir, "B", { test: "data2" });
      const checkpoint2 = await loadCheckpoint(tmpDir);

      // All data preserved
      expect(getPhaseData(checkpoint2, "A")).toEqual({ test: "data1" });
      expect(getPhaseData(checkpoint2, "B")).toEqual({ test: "data2" });
    });
  });

  describe("edge cases & error handling", () => {
    it("handles empty data object", async () => {
      await saveCheckpoint(tmpDir, "A", {});
      const checkpoint = await loadCheckpoint(tmpDir);

      expect(getPhaseData(checkpoint, "A")).toEqual({});
    });

    it("handles null values in phase data", async () => {
      const data = { value: null, other: "test" };
      await saveCheckpoint(tmpDir, "A", data);
      const checkpoint = await loadCheckpoint(tmpDir);

      expect(getPhaseData(checkpoint, "A")).toEqual(data);
    });

    it("handles arrays and objects in phase data", async () => {
      const data = {
        items: [1, 2, 3],
        nested: { key: "value" },
        mixed: [{ id: 1 }, { id: 2 }],
      };
      await saveCheckpoint(tmpDir, "A", data);
      const checkpoint = await loadCheckpoint(tmpDir);

      expect(getPhaseData(checkpoint, "A")).toEqual(data);
    });

    it("handles special characters in phase data strings", async () => {
      const data = {
        path: "/path/with spaces/and-special_chars.txt",
        emoji: "🎬",
        quotes: 'he said "hello"',
        newlines: "line1\nline2\nline3",
      };
      await saveCheckpoint(tmpDir, "A", data);
      const checkpoint = await loadCheckpoint(tmpDir);

      expect(getPhaseData(checkpoint, "A")).toEqual(data);
    });
  });
});
