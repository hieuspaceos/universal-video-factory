// Script generator — sends element map to Claude, returns narration script with [SCENE:XX] markers

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs/promises";
import * as path from "path";
import type { DirectorConfig, ElementMap, GeneratedScript, SceneMarker } from "./types.js";
import { SCRIPT_GENERATION_PROMPT } from "./prompts.js";

export class ScriptGenerator {
  private client: Anthropic;
  private config: DirectorConfig;

  constructor(config: DirectorConfig) {
    this.config = config;
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  /**
   * Generate a narration script from element map + feature description.
   * @param elements - Identified UI elements from screenshot analysis
   * @param feature - Feature to demonstrate
   * @param lang - Language code (e.g. "en", "fr")
   * @param outputDir - Directory to write script.txt
   */
  async generate(
    elements: ElementMap[],
    feature: string,
    lang: string,
    outputDir: string
  ): Promise<GeneratedScript> {
    const elementsSummary = elements
      .map(
        (el, i) =>
          `${i + 1}. ${el.element} — "${el.description}" at (${el.x}, ${el.y}) [confidence: ${el.confidence.toFixed(2)}]`
      )
      .join("\n");

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: SCRIPT_GENERATION_PROMPT(feature, lang, elementsSummary),
        },
      ],
    });

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const script = this.parseScriptResponse(rawText);

    // Write script.txt to output directory
    const scriptPath = path.join(outputDir, "script.txt");
    await fs.writeFile(scriptPath, script.rawScript, "utf-8");
    console.log(`[ScriptGenerator] Script saved to ${scriptPath}`);

    return script;
  }

  /** Parse and validate Claude's JSON script response */
  private parseScriptResponse(rawText: string): GeneratedScript {
    let parsed: {
      title?: string;
      scenes?: SceneMarker[];
      rawScript?: string;
    };

    try {
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.warn("[ScriptGenerator] Failed to parse Claude response as JSON");
      // Fallback: return raw text as single-scene script
      return {
        title: "Tutorial",
        scenes: [
          {
            index: 1,
            narration: rawText.slice(0, 200),
            actionDescription: "Follow the tutorial",
          },
        ],
        rawScript: `[SCENE:01]\n${rawText}`,
      };
    }

    const scenes: SceneMarker[] = (parsed.scenes ?? []).map((s, i) => ({
      index: s.index ?? i + 1,
      narration: s.narration ?? "",
      actionDescription: s.actionDescription ?? "",
    }));

    return {
      title: parsed.title ?? "Tutorial",
      scenes,
      rawScript: parsed.rawScript ?? this.buildRawScript(scenes),
    };
  }

  /** Build raw script text from scene markers if not provided */
  private buildRawScript(scenes: SceneMarker[]): string {
    return scenes
      .map((s) => {
        const padded = String(s.index).padStart(2, "0");
        return `[SCENE:${padded}]\n${s.narration}`;
      })
      .join("\n\n");
  }
}
