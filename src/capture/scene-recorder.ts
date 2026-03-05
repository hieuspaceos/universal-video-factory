// Scene recorder — executes click plan actions via Playwright, records per-scene video files
// Uses a single continuous browser session to preserve state across scenes.

import * as fs from "fs/promises";
import * as path from "path";
import type { Page, BrowserContext, Browser } from "playwright";
import { chromium } from "playwright";
import type { PlannedAction } from "../ai-director/types.js";
import type { BrowserConfig, SceneRecordingResult } from "./types.js";
import { CursorTracker } from "./cursor-tracker.js";

// Minimum visible duration per scene so viewers can follow along
const MIN_SCENE_DISPLAY_MS = 2000;
// Delay after typing each character for natural typing appearance
const TYPING_DELAY_MS = 80;
// Pause after an action completes so the result is visible
const POST_ACTION_PAUSE_MS = 1500;

export class SceneRecorder {
  private config: BrowserConfig;
  private retryAttempts: number;

  constructor(config: BrowserConfig, retryAttempts = 2) {
    this.config = config;
    this.retryAttempts = retryAttempts;
  }

  /**
   * Record all scenes in a single continuous browser session.
   * State persists across scenes (typed text, page changes, etc).
   * Each scene gets its own video via fresh recording contexts that share cookies/storage.
   */
  async recordAllScenes(
    actions: PlannedAction[],
    url: string,
    scenesDir: string,
    tempDir: string
  ): Promise<SceneRecordingResult[]> {
    const results: SceneRecordingResult[] = [];

    // Launch a persistent browser — all scenes share one instance
    const browser = await chromium.launch({ headless: this.config.headless });

    // Create an initial context to build up page state
    let stateContext = await browser.newContext({
      viewport: { width: this.config.viewportWidth, height: this.config.viewportHeight },
    });
    let statePage = await stateContext.newPage();
    statePage.setDefaultTimeout(this.config.clickActionTimeoutMs);
    statePage.setDefaultNavigationTimeout(this.config.pageLoadTimeoutMs);
    await statePage.goto(url, { waitUntil: "networkidle", timeout: this.config.pageLoadTimeoutMs });

    try {
      for (const action of actions) {
        console.log(`[SceneRecorder] Recording scene ${action.sceneIndex}: ${action.description}`);

        // Save current page state (cookies + localStorage) so recording context inherits it
        const storageState = await stateContext.storageState();
        const currentUrl = statePage.url();

        // Create a recording context with the same state
        const result = await this.recordSingleScene(
          browser, action, currentUrl, storageState, scenesDir, tempDir
        );
        results.push(result);

        // Execute the action on the state page too, so subsequent scenes see the result
        if (result.success) {
          await this.executeAction(statePage, action);
          await this.waitForStability(statePage, action);
        }
      }
    } finally {
      await statePage.close().catch(() => undefined);
      await stateContext.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
    }

    return results;
  }

  /** Record a single scene in an isolated recording context that inherits page state */
  private async recordSingleScene(
    browser: Browser,
    action: PlannedAction,
    currentUrl: string,
    storageState: object,
    scenesDir: string,
    tempDir: string
  ): Promise<SceneRecordingResult> {
    const scenePadded = String(action.sceneIndex).padStart(2, "0");
    const videoOutputPath = path.join(scenesDir, `scene-${scenePadded}.webm`);
    const sceneVideoDir = path.join(tempDir, `scene-${scenePadded}-raw`);
    await fs.mkdir(sceneVideoDir, { recursive: true });

    // Recording context inherits cookies/storage from the state context
    const context = await browser.newContext({
      viewport: { width: this.config.viewportWidth, height: this.config.viewportHeight },
      recordVideo: {
        dir: sceneVideoDir,
        size: { width: this.config.viewportWidth, height: this.config.viewportHeight },
      },
      storageState: storageState as Parameters<typeof browser.newContext>[0] extends infer T
        ? T extends { storageState?: infer S } ? S : never : never,
    });

    const page = await context.newPage();
    const cursorTracker = new CursorTracker();
    const startedAt = Date.now();

    try {
      page.setDefaultTimeout(this.config.clickActionTimeoutMs);
      page.setDefaultNavigationTimeout(this.config.pageLoadTimeoutMs);

      await cursorTracker.startTracking(page);
      await page.goto(currentUrl, { waitUntil: "networkidle", timeout: this.config.pageLoadTimeoutMs });

      // Brief pause so the initial page state is visible in the recording
      await page.waitForTimeout(500);

      // Execute the action
      await this.executeAction(page, action);

      // Wait for stability + post-action visibility pause
      await this.waitForStability(page, action);
      await page.waitForTimeout(POST_ACTION_PAUSE_MS);

      // Ensure minimum scene duration for readability
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_SCENE_DISPLAY_MS) {
        await page.waitForTimeout(MIN_SCENE_DISPLAY_MS - elapsed);
      }

      const durationMs = Date.now() - startedAt;
      cursorTracker.flushEvents();

      // Close context to flush the video file
      await page.close();
      await context.close();

      // Move raw video to final location
      const rawVideos = await fs.readdir(sceneVideoDir);
      const videoFile = rawVideos.find((f) => f.endsWith(".webm"));
      if (videoFile) {
        const rawPath = path.join(sceneVideoDir, videoFile);
        await fs.rename(rawPath, videoOutputPath);
      }

      console.log(`[SceneRecorder] Scene ${scenePadded} recorded (${durationMs}ms)`);
      return {
        sceneIndex: action.sceneIndex,
        videoPath: videoOutputPath,
        durationMs,
        success: true,
      };
    } catch (err) {
      await page.close().catch(() => undefined);
      await context.close().catch(() => undefined);

      const errorMsg = (err as Error).message;
      console.error(`[SceneRecorder] Scene ${scenePadded} failed: ${errorMsg}`);
      return { sceneIndex: action.sceneIndex, videoPath: "", durationMs: 0, success: false, error: errorMsg };
    }
  }

  /** Execute action — parses description for click, type, and keyboard actions */
  private async executeAction(page: Page, action: PlannedAction): Promise<void> {
    const desc = action.description.toLowerCase();

    // Skip "no action" scenes (intro/outro/confirmation)
    if (desc.includes("no action")) return;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        if (action.useFallback) {
          await this.executeStagehandFallback(page, action);
        } else {
          await this.executeSmartAction(page, action);
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

  /**
   * Smart action execution — interprets the action description to determine
   * what Playwright commands to run (click, type, press keys, etc).
   */
  private async executeSmartAction(page: Page, action: PlannedAction): Promise<void> {
    const desc = action.description;
    const descLower = desc.toLowerCase();

    // Try to use CSS selector first for precise targeting
    const target = action.selector
      ? await page.$(action.selector).catch(() => null)
      : null;

    // Detect typing actions: "type", "enter text", "input"
    const typeMatch = desc.match(/type[^'"]*['"]([^'"]+)['"]/i)
      ?? desc.match(/enter[^'"]*['"]([^'"]+)['"]/i)
      ?? desc.match(/example\s+['"]([^'"]+)['"]/i)
      ?? desc.match(/for example\s+['"]([^'"]+)['"]/i);

    // Detect keyboard press: "press Enter", "press Tab", etc.
    const pressMatch = desc.match(/press\s+(?:the\s+)?(\w+)\s+key/i)
      ?? desc.match(/press\s+(\w+)/i);

    if (descLower.includes("click") || descLower.includes("focus")) {
      // Click action — move cursor visually then click
      if (target) {
        await target.scrollIntoViewIfNeeded();
        const box = await target.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
          await page.waitForTimeout(200);
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        }
      } else {
        await page.mouse.move(action.x, action.y, { steps: 15 });
        await page.waitForTimeout(200);
        await page.mouse.click(action.x, action.y);
      }
    }

    // Type text if detected in description
    if (typeMatch) {
      const textToType = typeMatch[1];
      await page.waitForTimeout(300);
      await page.keyboard.type(textToType, { delay: TYPING_DELAY_MS });
      await page.waitForTimeout(500);
    }

    // Press key if detected
    if (pressMatch && !typeMatch) {
      const key = pressMatch[1];
      const keyMap: Record<string, string> = {
        enter: "Enter", tab: "Tab", escape: "Escape",
        backspace: "Backspace", delete: "Delete", space: "Space",
      };
      const mappedKey = keyMap[key.toLowerCase()] ?? key;
      await page.waitForTimeout(300);
      await page.keyboard.press(mappedKey);
      await page.waitForTimeout(500);
    }

    // Fallback: if no specific action detected, just click at coordinates
    if (!descLower.includes("click") && !descLower.includes("focus")
        && !typeMatch && !pressMatch) {
      await page.mouse.move(action.x, action.y, { steps: 15 });
      await page.waitForTimeout(200);
      await page.mouse.click(action.x, action.y);
    }
  }

  /** Stagehand natural-language fallback for low-confidence actions */
  private async executeStagehandFallback(page: Page, action: PlannedAction): Promise<void> {
    console.log(`[SceneRecorder] Using Stagehand fallback for: "${action.description}"`);
    try {
      const { Stagehand } = await import("@browserbasehq/stagehand");
      const stagehand = new Stagehand({ env: "LOCAL", verbose: 0, enableCaching: false });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await stagehand.init({ modelName: "claude-sonnet-4-6" as any });
      await stagehand.page.act(action.description);
      await stagehand.close();
    } catch (err) {
      console.warn(`[SceneRecorder] Stagehand fallback unavailable, using smart action: ${(err as Error).message}`);
      await this.executeSmartAction(page, action);
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
