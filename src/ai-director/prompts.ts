// Claude prompt templates for AI Director

export const SCREENSHOT_ANALYSIS_PROMPT = (feature: string) => `
You are a UI analysis expert. Analyze this screenshot and identify all interactive elements relevant to the feature: "${feature}".

Return a JSON object with this exact structure:
{
  "pageTitle": "string",
  "pageDescription": "string — one sentence describing the page",
  "elements": [
    {
      "element": "button|link|input|dropdown|checkbox|tab|menu-item|other",
      "description": "human-readable description of what this element does",
      "x": number (center x coordinate in pixels),
      "y": number (center y coordinate in pixels),
      "width": number (element width in pixels),
      "height": number (element height in pixels),
      "confidence": number (0.0 to 1.0 — how certain you are of the coordinates),
      "selector": "optional CSS selector if clearly identifiable"
    }
  ]
}

Rules:
- Only include elements relevant to "${feature}"
- x/y must be the CENTER of the element
- Coordinates must be within viewport bounds
- Return ONLY valid JSON, no markdown fences, no explanation
- If you cannot identify coordinates confidently, set confidence < 0.5
`.trim();

export const SCRIPT_GENERATION_PROMPT = (
  feature: string,
  lang: string,
  elements: string
) => `
You are a tutorial video scriptwriter. Write a concise narration script for demonstrating: "${feature}".

Language: ${lang}

Available UI elements on this page:
${elements}

Return a JSON object with this exact structure:
{
  "title": "video title string",
  "scenes": [
    {
      "index": 1,
      "narration": "spoken narration text for this scene",
      "actionDescription": "what action the user takes (e.g. 'click the Sign Up button')"
    }
  ],
  "rawScript": "full script as plain text with [SCENE:XX] markers"
}

Rules:
- Each scene = ONE user action (click, type, scroll, etc.)
- Narration should be natural, concise — max 2 sentences per scene
- [SCENE:XX] markers in rawScript must match scene index numbers
- First scene should briefly describe what we're about to do
- Last scene should confirm the action was completed
- Return ONLY valid JSON, no markdown fences
`.trim();

export const CLICK_COORDINATE_REFINEMENT_PROMPT = (
  actionDescription: string,
  previousCoords: { x: number; y: number }
) => `
You previously identified an element for this action: "${actionDescription}"
Previous coordinates: x=${previousCoords.x}, y=${previousCoords.y}

Look at this new screenshot. Has the page state changed? Is the target element still at those coordinates?

Return JSON:
{
  "found": true/false,
  "x": number,
  "y": number,
  "confidence": number (0.0 to 1.0),
  "reason": "brief explanation"
}

Return ONLY valid JSON, no markdown fences.
`.trim();
