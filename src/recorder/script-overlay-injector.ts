// Script overlay — injects invisible keyboard listener into the page for scene tracking
// Human reads instructions from terminal, presses Space to advance, Esc to stop recording
// No visible overlay in Chrome → clean recording without UI artifacts

import type { Page } from "playwright";
import type { TutorialScript } from "../script/script-types.js";

/**
 * Inject invisible keyboard listener into page (no visible overlay).
 * Scene boundary timestamps captured via window.__vf_scene_marks.
 * Step instructions are shown in the terminal instead.
 */
export async function injectScriptOverlay(
  page: Page,
  script: TutorialScript
): Promise<void> {
  const totalSteps = script.steps.length;
  await page.evaluate(`(function() {
    window.__vf_scene_marks = window.__vf_scene_marks || [];
    window.__vf_current_step = window.__vf_current_step || 0;
    window.__vf_recording_done = false;
    window.__vf_total_steps = ${totalSteps};

    document.addEventListener("keydown", function(e) {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        var idx = window.__vf_current_step;
        window.__vf_scene_marks.push({ step: idx + 2, ms: Date.now() - (window.__vf_startTime || Date.now()) });
        window.__vf_current_step = idx + 1;
      }
      if (e.code === "Escape") {
        window.__vf_recording_done = true;
      }
    });

    // Mark first scene start if not already marked
    if (window.__vf_scene_marks.length === 0) {
      window.__vf_scene_marks.push({ step: 1, ms: 0 });
    }
  })()`);
}

/** Get current step index from page */
export async function getCurrentStep(page: Page): Promise<number> {
  try {
    return await page.evaluate(`window.__vf_current_step || 0`) as number;
  } catch {
    return 0;
  }
}

/** Check if human pressed Esc to stop recording */
export async function isRecordingDone(page: Page): Promise<boolean> {
  try {
    return await page.evaluate(`!!window.__vf_recording_done`) as boolean;
  } catch {
    return true;
  }
}

/** Get scene boundary marks from overlay hotkey presses */
export async function getSceneMarks(page: Page): Promise<Array<{ step: number; ms: number }>> {
  try {
    return await page.evaluate(`window.__vf_scene_marks || []`) as Array<{ step: number; ms: number }>;
  } catch {
    return [];
  }
}
