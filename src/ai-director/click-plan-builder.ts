// Click plan builder — maps script scenes to click coordinates, writes click_plan.json

import * as fs from "fs/promises";
import * as path from "path";
import type { DirectorConfig, ElementMap, GeneratedScript, ClickPlan, PlannedAction } from "./types.js";

export class ClickPlanBuilder {
  private config: DirectorConfig;

  constructor(config: DirectorConfig) {
    this.config = config;
  }

  /**
   * Build a click plan by mapping each script scene to the best matching element.
   * Actions whose element confidence is below threshold are flagged for Stagehand fallback.
   */
  build(
    script: GeneratedScript,
    elements: ElementMap[],
    url: string,
    feature: string
  ): ClickPlan {
    const actions: PlannedAction[] = script.scenes.map((scene) => {
      const matched = this.matchElementToAction(scene.actionDescription, elements);

      if (!matched) {
        // No element found — use center of screen as placeholder, flag fallback
        return {
          sceneIndex: scene.index,
          description: scene.actionDescription,
          narration: scene.narration,
          x: Math.round(this.config.viewportWidth / 2),
          y: Math.round(this.config.viewportHeight / 2),
          confidence: 0,
          useFallback: true,
          waitFor: "networkidle" as const,
          waitMs: 1000,
        };
      }

      const useFallback = matched.confidence < this.config.confidenceThreshold;

      return {
        sceneIndex: scene.index,
        description: scene.actionDescription,
        narration: scene.narration,
        x: matched.x,
        y: matched.y,
        selector: matched.selector,
        confidence: matched.confidence,
        useFallback,
        waitFor: "networkidle" as const,
        waitMs: 500,
      };
    });

    return {
      url,
      feature,
      generatedAt: new Date().toISOString(),
      actions,
    };
  }

  /**
   * Save click plan to JSON file and return the file path.
   */
  async save(plan: ClickPlan, outputDir: string): Promise<string> {
    const planPath = path.join(outputDir, "click_plan.json");
    await fs.writeFile(planPath, JSON.stringify(plan, null, 2), "utf-8");
    console.log(`[ClickPlanBuilder] Click plan saved to ${planPath}`);

    const fallbackCount = plan.actions.filter((a) => a.useFallback).length;
    if (fallbackCount > 0) {
      console.log(`[ClickPlanBuilder] ${fallbackCount} action(s) flagged for Stagehand fallback`);
    }

    return planPath;
  }

  /**
   * Match an action description to the most relevant element using keyword scoring.
   */
  private matchElementToAction(
    actionDescription: string,
    elements: ElementMap[]
  ): ElementMap | null {
    if (elements.length === 0) return null;

    const descLower = actionDescription.toLowerCase();
    const keywords = descLower.split(/\s+/).filter((w) => w.length > 2);

    let bestMatch: ElementMap | null = null;
    let bestScore = -1;

    for (const el of elements) {
      const elText = `${el.element} ${el.description}`.toLowerCase();
      let score = el.confidence;

      // Boost score for keyword matches in element description
      for (const kw of keywords) {
        if (elText.includes(kw)) score += 0.2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = el;
      }
    }

    return bestMatch;
  }
}
