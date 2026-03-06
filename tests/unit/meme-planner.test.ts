// Unit tests for src/ai-director/meme-planner.ts

import { describe, it, expect } from "vitest";
import { planMemeInserts } from "../../src/ai-director/meme-planner.js";

describe("planMemeInserts", () => {
  it("identifies success moments", () => {
    const scenes = [{ narration: "Great, everything works perfectly!" }];
    const result = planMemeInserts(scenes);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("success");
    expect(result[0].mode).toBe("pip");
  });

  it("identifies frustration moments", () => {
    const scenes = [{ narration: "Oops, we got an error here" }];
    const result = planMemeInserts(scenes);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("frustration");
  });

  it("identifies surprise moments", () => {
    const scenes = [{ narration: "Wow, that was amazing!" }];
    const result = planMemeInserts(scenes);
    expect(result[0].category).toBe("surprise");
  });

  it("identifies thinking moments", () => {
    const scenes = [{ narration: "Let's think about how to decide" }];
    const result = planMemeInserts(scenes);
    expect(result[0].category).toBe("thinking");
  });

  it("identifies celebration moments", () => {
    const scenes = [{ narration: "Hooray, let's celebrate this moment!" }];
    const result = planMemeInserts(scenes);
    expect(result[0].category).toBe("celebration");
  });

  it("enforces minimum gap of 3 scenes between memes", () => {
    const scenes = [
      { narration: "This works perfectly" }, // success — scene 0
      { narration: "Wow incredible result" }, // surprise — scene 1 (skip: gap < 3)
      { narration: "Error found here" },      // frustration — scene 2 (skip: gap < 3)
      { narration: "Finally done" },          // scene 3 — OK (gap = 3)
    ];
    const result = planMemeInserts(scenes);
    expect(result).toHaveLength(2);
    expect(result[0].sceneIndex).toBe(0);
    expect(result[1].sceneIndex).toBe(3);
  });

  it("returns empty for scenes with no meme-worthy content", () => {
    const scenes = [
      { narration: "Click on the sidebar" },
      { narration: "Enter your name" },
    ];
    expect(planMemeInserts(scenes)).toHaveLength(0);
  });

  it("defaults to frameOffset 15 and durationFrames 45", () => {
    const scenes = [{ narration: "This is done successfully" }];
    const result = planMemeInserts(scenes);
    expect(result[0].frameOffset).toBe(15);
    expect(result[0].durationFrames).toBe(45);
  });

  it("handles empty scenes", () => {
    expect(planMemeInserts([])).toHaveLength(0);
  });

  it("max one meme per scene", () => {
    // "success" and "celebration" both match, but only first match should be used
    const scenes = [{ narration: "Congratulations, it works perfectly!" }];
    const result = planMemeInserts(scenes);
    expect(result).toHaveLength(1);
  });
});
