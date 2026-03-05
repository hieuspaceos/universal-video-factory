// Scene recorder — executes click plan actions via Playwright, records per-scene video files

import * as fs from "fs/promises";
import * as path from "path";
import type { Page, BrowserContext } from "playwright";
import { chromium } from "playwright";
import type { PlannedAction } from "../ai-director/types.js";
import type { BrowserConfig, SceneRecordingResult } from "./types.js";
import { CursorTracker } from "./cursor-tracker.js";

export class SceneRecorder {
  private config: BrowserConfig;
  private retryAttempts: number;

  constructor(config: BrowserConfig, retryAttempts = 2) {
    this.config = config;
    this.retryAttempts = retryAttempts;
  }

  /**
   * Record all scenes by executing each planned action in a fresh recording context.
   * Each scene gets its own video file via Playwright's per-context video recording.
   */
  async recordAllScenes(
    actions: PlannedAction[],
    url: string,
    scenesDir: string,
    tempDir: string
  ): Promise<SceneRecordingResult[]> {
    const results: SceneRecordingResult[] = [];

    for (const action of actions) {
      console.log(`[SceneRecorder] Recording scene ${action.sceneIndex}: ${action.description}`);
      const result = await this.recordScene(action, url, scenesDir, tempDir);
      results.push(result);
    }

    return results;
  }

  /** Record a single scene — launches isolated context for clean per-scene video */
  private async recordScene(
    action: PlannedAction,
    url: string,
    scenesDir: string,
    tempDir: string
  ): Promise<SceneRecordingResult> {
    const scenePadded = String(action.sceneIndex).padStart(2, "0");
    const videoOutputPath = path.join(scenesDir, `scene-${scenePadded}.mp4`);
    const sceneVideoDir = path.join(tempDir, `scene-${scenePadded}-raw`);
    await fs.mkdir(sceneVideoDir, { recursive: true });

    const browser = await chromium.launch({ headless: this.config.headless });
    const context = await browser.newContext({
      viewport: { width: this.config.viewportWidth, height: this.config.viewportHeight },
      recordVideo: {
        dir: sceneVideoDir,
        size: { width: this.config.viewportWidth, height: this.config.viewportHeight },
      },
    });

    const page = await context.newPage();
    const cursorTracker = new CursorTracker();
    const startedAt = Date.now();

    try {
      page.setDefaultTimeout(this.config.clickActionTimeoutMs);
      page.setDefaultNavigationTimeout(this.config.pageLoadTimeoutMs);

      await cursorTracker.startTracking(page);
      await page.goto(url, { waitUntil: "networkidle", timeout: this.config.pageLoadTimeoutMs });

      // Execute action with retry logic
      await this.executeActionWithRetry(page, action);

      // Wait for page to stabilize after action
      await this.waitForStability(page, action);

      const durationMs = Date.now() - startedAt;
      const cursorEvents = cursorTracker.flushEvents();

      // Close context to flush the video file
      await page.close();
      await context.close();
      await browser.close();

      // Move raw video to final location
      const rawVideos = await fs.readdir(sceneVideoDir);
      const videoFile = rawVideos.find((f) => f.endsWith(".webm"));
      if (videoFile) {
        const rawPath = path.join(sceneVideoDir, videoFile);
        await fs.rename(rawPath, videoOutputPath.replace(".mp4", ".webm"));
      }

      console.log(`[SceneRecorder] Scene ${scenePadded} recorded (${durationMs}ms)`);
      return {
        sceneIndex: action.sceneIndex,
        videoPath: videoOutputPath.replace(".mp4", ".webm"),
        durationMs,
        success: true,
      };
    } catch (err) {
      await page.close().catch(() => undefined);
      await context.close().catch(() => undefined);
      await browser.close().catch(() => undefined);

      const errorMsg = (err as Error).message;
      console.error(`[SceneRecorder] Scene ${scenePadded} failed: ${errorMsg}`);
      return { sceneIndex: action.sceneIndex, videoPath: "", durationMs: 0, success: false, error: errorMsg };
    }
  }

  /** Execute click action — uses Stagehand fallback when flagged */
  private async executeActionWithRetry(page: Page, action: PlannedAction): Promise<void> {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        if (action.useFallback) {
          await this.executeStagehandFallback(page, action);
        } else {
          await page.mouse.move(action.x, action.y, { steps: 10 });
          await page.mouse.click(action.x, action.y);
        }
        console.log(`[SceneRecorder] Action executed (attempt ${attempt}): ${action.description}`);
        return;
      } catch (err) {
        console.warn(`[SceneRecorder] Attempt ${attempt} failed: ${(err as Error).message}`);
        if (attempt === this.retryAttempts) throw err;
        await page.waitForTimeout(500);
      }
    }
  }

  /** Stagehand natural-language fallback for low-confidence actions */
  private async executeStagehandFallback(page: Page, action: PlannedAction): Promise<void> {
    console.log(`[SceneRecorder] Using Stagehand fallback for: "${action.description}"`);
    try {
      // Dynamic import to keep Stagehand optional
      const { Stagehand } = await import("@browserbasehq/stagehand");
      const stagehand = new Stagehand({ env: "LOCAL", verbose: 0, enableCaching: false });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await stagehand.init({ modelName: "claude-sonnet-4-6" as any });
      await stagehand.page.act(action.description);
      await stagehand.close();
    } catch (err) {
      // If Stagehand not available, fall back to coordinate click anyway
      console.warn(`[SceneRecorder] Stagehand fallback unavailable, using coordinates: ${(err as Error).message}`);
      await page.mouse.move(action.x, action.y, { steps: 10 });
      await page.mouse.click(action.x, action.y);
    }
  }

  /** Wait for page stability after action */
  private async waitForStability(page: Page, action: PlannedAction): Promise<void> {
    if (action.waitFor === "networkidle") {
      await page.waitForLoadState("networkidle").catch(() => undefined);
    } else if (action.waitFor === "domcontentloaded") {
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    } else if (action.waitFor === "load") {
      await page.waitForLoadState("load").catch(() => undefined);
    }

    if (action.waitMs && action.waitMs > 0) {
      await page.waitForTimeout(action.waitMs);
    }
  }
}
