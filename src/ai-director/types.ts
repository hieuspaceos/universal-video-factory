// AI Director types — Claude Vision analysis and script generation

export interface ElementMap {
  element: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Confidence score 0–1 from Claude Vision */
  confidence: number;
  /** CSS selector if detectable */
  selector?: string;
}

export interface ScreenshotAnalysis {
  elements: ElementMap[];
  pageTitle: string;
  pageDescription: string;
  rawResponse: string;
}

export interface SceneMarker {
  index: number;
  /** Narration text for this scene */
  narration: string;
  /** Description of what action to perform */
  actionDescription: string;
}

export interface GeneratedScript {
  title: string;
  scenes: SceneMarker[];
  rawScript: string;
}

export interface ClickPlan {
  url: string;
  feature: string;
  generatedAt: string;
  actions: PlannedAction[];
}

export interface PlannedAction {
  sceneIndex: number;
  description: string;
  narration: string;
  x: number;
  y: number;
  selector?: string;
  waitFor?: "networkidle" | "domcontentloaded" | "load" | "timeout";
  waitMs?: number;
  /** Below CLAUDE_VISION_CONFIDENCE_THRESHOLD → triggers Stagehand fallback */
  confidence: number;
  useFallback: boolean;
}

export interface DirectorConfig {
  anthropicApiKey: string;
  model: string;
  confidenceThreshold: number;
  viewportWidth: number;
  viewportHeight: number;
}
