// Pipeline coordinator — orchestrates AI Director → Capture phases sequentially

import * as fs from "fs/promises";
import * as path from "path";
import { ScreenshotAnalyzer } from "../ai-director/screenshot-analyzer.js";
import { ScriptGenerator } from "../ai-director/script-generator.js";
import { ClickPlanBuilder } from "../ai-director/click-plan-builder.js";
import { BrowserManager } from "../capture/browser-manager.js";
import { SceneRecorder } from "../capture/scene-recorder.js";
import type { PipelineConfig, CaptureResult, PipelineResult } from "./types.js";
import type { DirectorConfig } from "../ai-director/types.js";
import type { BrowserConfig, CaptureMetadata } from "../capture/types.js";

export class PipelineCoordinator {
  private config: PipelineConfig;

  constructor(config: PipelineConfig) {
    this.config = config;
  }

  async run(): Promise<PipelineResult> {
    const startedAt = Date.now();
    console.log(`[Pipeline] Starting for: ${this.config.url} — "${this.config.feature}"`);

    try {
      // Create output directory structure
      const dirs = await this.createOutputDirs();

      // Phase A: AI Director
      const captureResult = await this.runAIDirectorPhase(dirs);

      // Phase B: Capture Engine
      await this.runCapturePhase(captureResult, dirs);

      return {
        capture: captureResult,
        success: true,
        elapsedMs: Date.now() - startedAt,
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
        elapsedMs: Date.now() - startedAt,
      };
    }
  }

  /** Phase A: Screenshot → Claude Vision → Script + Click Plan */
  private async runAIDirectorPhase(dirs: OutputDirs): Promise<CaptureResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local");

    const directorConfig: DirectorConfig = {
      anthropicApiKey: apiKey,
      model: "claude-sonnet-4-6",
      confidenceThreshold: parseFloat(process.env.CLAUDE_VISION_CONFIDENCE_THRESHOLD ?? "0.7"),
      viewportWidth: parseInt(process.env.VIEWPORT_WIDTH ?? "1920"),
      viewportHeight: parseInt(process.env.VIEWPORT_HEIGHT ?? "1080"),
    };

    const browserConfig = this.buildBrowserConfig();
    const browserManager = new BrowserManager(browserConfig);

    console.log("[Pipeline] Phase A: Launching browser for screenshot...");
    const page = await browserManager.launch(dirs.temp);
    let screenshotPath = "";

    try {
      await browserManager.navigateTo(this.config.url);

      // Manual mode: pause for user interaction before screenshot
      if (this.config.manual) {
        console.log("[Pipeline] MANUAL MODE — press Enter after navigating to the desired state...");
        await new Promise<void>((resolve) => process.stdin.once("data", () => resolve()));
      }

      screenshotPath = path.join(dirs.temp, "initial-screenshot.png");
      await browserManager.screenshot(screenshotPath);
      console.log(`[Pipeline] Screenshot saved: ${screenshotPath}`);
    } finally {
      await browserManager.close();
    }

    // Analyze screenshot with Claude Vision
    const analyzer = new ScreenshotAnalyzer(directorConfig);
    console.log("[Pipeline] Analyzing screenshot with Claude Vision...");
    const analysis = await analyzer.analyze(screenshotPath, this.config.feature);
    console.log(`[Pipeline] Found ${analysis.elements.length} relevant element(s)`);

    // Generate narration script
    const scriptGen = new ScriptGenerator(directorConfig);
    console.log("[Pipeline] Generating script...");
    const script = await scriptGen.generate(
      analysis.elements,
      this.config.feature,
      this.config.lang,
      dirs.output
    );
    console.log(`[Pipeline] Script has ${script.scenes.length} scene(s)`);

    // Build click plan
    const planBuilder = new ClickPlanBuilder(directorConfig);
    const clickPlan = planBuilder.build(script, analysis.elements, this.config.url, this.config.feature);
    const clickPlanPath = await planBuilder.save(clickPlan, dirs.output);

    return {
      scenes: [],
      scriptPath: path.join(dirs.output, "script.txt"),
      clickPlanPath,
      metadataPath: path.join(dirs.output, "capture_metadata.json"),
      outputDir: dirs.output,
    };
  }

  /** Phase B: Execute click plan via Playwright, record scenes */
  private async runCapturePhase(captureResult: CaptureResult, dirs: OutputDirs): Promise<void> {
    const raw = await fs.readFile(captureResult.clickPlanPath, "utf-8");
    const clickPlan = JSON.parse(raw);

    const browserConfig = this.buildBrowserConfig();
    const recorder = new SceneRecorder(
      browserConfig,
      parseInt(process.env.CLICK_RETRY_ATTEMPTS ?? "2")
    );

    console.log(`[Pipeline] Phase B: Recording ${clickPlan.actions.length} scene(s)...`);
    const results = await recorder.recordAllScenes(
      clickPlan.actions,
      this.config.url,
      dirs.scenes,
      dirs.temp
    );

    // Build metadata
    const metadata: CaptureMetadata = {
      url: this.config.url,
      feature: this.config.feature,
      capturedAt: new Date().toISOString(),
      viewportWidth: browserConfig.viewportWidth,
      viewportHeight: browserConfig.viewportHeight,
      fps: browserConfig.recordingFps,
      totalScenes: results.length,
      scenes: results.map((r, i) => ({
        index: r.sceneIndex,
        videoFile: path.basename(r.videoPath),
        durationMs: r.durationMs,
        clickX: clickPlan.actions[i]?.x ?? 0,
        clickY: clickPlan.actions[i]?.y ?? 0,
        actionDescription: clickPlan.actions[i]?.description ?? "",
        usedFallback: clickPlan.actions[i]?.useFallback ?? false,
        cursorEvents: [],
      })),
    };

    await fs.writeFile(captureResult.metadataPath, JSON.stringify(metadata, null, 2), "utf-8");
    console.log(`[Pipeline] Metadata saved: ${captureResult.metadataPath}`);

    const successCount = results.filter((r) => r.success).length;
    console.log(`[Pipeline] Recorded ${successCount}/${results.length} scene(s) successfully`);
  }

  private buildBrowserConfig(): BrowserConfig {
    return {
      viewportWidth: parseInt(process.env.VIEWPORT_WIDTH ?? "1920"),
      viewportHeight: parseInt(process.env.VIEWPORT_HEIGHT ?? "1080"),
      headless: true,
      cookiesPath: this.config.cookies,
      recordingFps: parseInt(process.env.SCENE_RECORDING_FPS ?? "30"),
      pageLoadTimeoutMs: parseInt(process.env.PAGE_LOAD_TIMEOUT_MS ?? "30000"),
      clickActionTimeoutMs: parseInt(process.env.CLICK_ACTION_TIMEOUT_MS ?? "10000"),
    };
  }

  private async createOutputDirs(): Promise<OutputDirs> {
    const output = this.config.output;
    const dirs: OutputDirs = {
      output,
      scenes: path.join(output, "scenes"),
      audio: path.join(output, "audio"),
      temp: path.join(output, "temp"),
    };
    for (const dir of Object.values(dirs)) {
      await fs.mkdir(dir, { recursive: true });
    }
    console.log(`[Pipeline] Output directory: ${output}`);
    return dirs;
  }
}

interface OutputDirs {
  output: string;
  scenes: string;
  audio: string;
  temp: string;
}
