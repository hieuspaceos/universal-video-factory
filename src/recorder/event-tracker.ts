// Event tracker — injects mouse/click/scroll/key listeners into page via Playwright
// Captures events into window.__vf_events array, flushed periodically to Node.js

import type { Page } from "playwright";
import type { CursorEvent } from "./recorder-types.js";

// Throttle mouse move events to avoid flooding (capture every 50ms max)
const MOVE_THROTTLE_MS = 50;

/** Inject event listeners into the page. Call flushEvents() to retrieve captured events. */
export async function injectEventTrackers(page: Page): Promise<void> {
  await page.evaluate(`(function(throttleMs) {
    window.__vf_events = [];
    window.__vf_startTime = Date.now();
    var lastMoveTime = 0;

    document.addEventListener("mousemove", function(e) {
      var now = Date.now();
      if (now - lastMoveTime < throttleMs) return;
      lastMoveTime = now;
      window.__vf_events.push({ type: "move", x: e.clientX, y: e.clientY, ms: now - window.__vf_startTime });
    }, { passive: true });

    document.addEventListener("click", function(e) {
      window.__vf_events.push({ type: "click", x: e.clientX, y: e.clientY, ms: Date.now() - window.__vf_startTime, button: e.button === 0 ? "left" : "right" });
    }, { passive: true });

    document.addEventListener("scroll", function() {
      window.__vf_events.push({ type: "scroll", x: window.scrollX, y: window.scrollY, ms: Date.now() - window.__vf_startTime, deltaY: window.scrollY });
    }, { passive: true });

    document.addEventListener("keydown", function(e) {
      if (["Shift","Control","Alt","Meta"].indexOf(e.key) !== -1) return;
      window.__vf_events.push({ type: "key", x: 0, y: 0, ms: Date.now() - window.__vf_startTime, key: e.key });
    }, { passive: true });
  })(${MOVE_THROTTLE_MS})`);
}

/** Flush captured events from page and clear the buffer */
export async function flushEvents(page: Page): Promise<CursorEvent[]> {
  try {
    const events = await page.evaluate(`(function() {
      var captured = window.__vf_events || [];
      window.__vf_events = [];
      return captured;
    })()`);
    return events as CursorEvent[];
  } catch {
    return [];
  }
}

/** Re-inject trackers after page navigation (listeners lost on new page) */
export async function reinjectAfterNavigation(page: Page): Promise<void> {
  try {
    const hasTracker = await page.evaluate(`!!window.__vf_startTime`);
    if (!hasTracker) {
      await injectEventTrackers(page);
    }
  } catch {
    await injectEventTrackers(page);
  }
}
