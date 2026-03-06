// Unit tests for src/compositor/transition-planner.ts

import { describe, it, expect } from "vitest";
import { planTransitions } from "../../src/compositor/transition-planner.js";

describe("planTransitions", () => {
  it("assigns 'none' to first scene (intro handles entry)", () => {
    const scenes = [{ narration: "Welcome to the tutorial" }];
    const result = planTransitions(scenes);
    expect(result[0].type).toBe("none");
    expect(result[0].durationFrames).toBe(0);
  });

  it("assigns slide-left for 'next step' narration", () => {
    const scenes = [
      { narration: "Intro" },
      { narration: "Now let's move to the next step" },
    ];
    const result = planTransitions(scenes);
    expect(result[1].type).toBe("slide-left");
    expect(result[1].durationFrames).toBe(15);
  });

  it("assigns slide-right for 'go back' narration", () => {
    const scenes = [
      { narration: "Intro" },
      { narration: "Let's go back to the previous page" },
    ];
    const result = planTransitions(scenes);
    expect(result[1].type).toBe("slide-right");
  });

  it("assigns zoom-in for 'look at' narration", () => {
    const scenes = [
      { narration: "Intro" },
      { narration: "Let's look at the details here" },
    ];
    const result = planTransitions(scenes);
    expect(result[1].type).toBe("zoom-in");
  });

  it("assigns zoom-out for 'overview' narration", () => {
    const scenes = [
      { narration: "Intro" },
      { narration: "Let's see the big picture" },
    ];
    const result = planTransitions(scenes);
    expect(result[1].type).toBe("zoom-out");
  });

  it("assigns blur-dissolve for 'finally' narration", () => {
    const scenes = [
      { narration: "Intro" },
      { narration: "Finally the result is complete" },
    ];
    const result = planTransitions(scenes);
    expect(result[1].type).toBe("blur-dissolve");
  });

  it("defaults to fade when no keyword matches", () => {
    const scenes = [
      { narration: "Intro" },
      { narration: "Here we see the interface" },
    ];
    const result = planTransitions(scenes);
    expect(result[1].type).toBe("fade");
  });

  it("checks actionDescription when narration has no keywords", () => {
    const scenes = [
      { narration: "Intro" },
      { narration: "Something", actionDescription: "zoom in on the button" },
    ];
    const result = planTransitions(scenes);
    expect(result[1].type).toBe("zoom-in");
  });

  it("returns correct sceneIndex for each plan", () => {
    const scenes = Array.from({ length: 5 }, (_, i) => ({
      narration: `Scene ${i}`,
    }));
    const result = planTransitions(scenes);
    result.forEach((t, i) => expect(t.sceneIndex).toBe(i));
  });

  it("handles empty scenes array", () => {
    expect(planTransitions([])).toHaveLength(0);
  });
});
