// Cursor tracker — intercepts mouse events on the page, logs cursor path + click timestamps

import type { Page } from "playwright";
import type { CursorEvent } from "../orchestrator/types.js";
import type { CursorTrackerState } from "./types.js";

export class CursorTracker {
  private state: CursorTrackerState = { events: [], isTracking: false };

  /** Start tracking mouse events on the given page via page.exposeFunction + window events */
  async startTracking(page: Page): Promise<void> {
    this.state = { events: [], isTracking: true };

    // Expose a function the browser can call to record events
    await page.exposeFunction(
      "__cursorTrack__",
      (event: CursorEvent) => {
        if (this.state.isTracking) {
          this.state.events.push(event);
        }
      }
    );

    // Inject listener script into the page.
    // This callback runs inside the browser (DOM) context — cast globals accordingly.
    await page.addInitScript(() => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = globalThis as unknown as Record<string, any>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = (globalThis as unknown as Record<string, any>).document as any;

      const track = (type: "move" | "click" | "scroll", x: number, y: number) => {
        win.__cursorTrack__({ timestamp: Date.now(), x, y, type });
      };

      doc.addEventListener("mousemove", (e: any) => track("move", e.clientX, e.clientY), {
        passive: true,
      });
      doc.addEventListener("click", (e: any) => track("click", e.clientX, e.clientY), {
        passive: true,
      });
      doc.addEventListener(
        "scroll",
        () => track("scroll", win.scrollX ?? 0, win.scrollY ?? 0),
        { passive: true }
      );
      /* eslint-enable @typescript-eslint/no-explicit-any */
    });

    console.log("[CursorTracker] Tracking started.");
  }

  /** Stop accumulating events and return collected data */
  stopTracking(): CursorEvent[] {
    this.state.isTracking = false;
    const events = [...this.state.events];
    console.log(`[CursorTracker] Stopped. Collected ${events.length} cursor event(s).`);
    return events;
  }

  /** Flush events collected since last flush (for per-scene slicing) */
  flushEvents(): CursorEvent[] {
    const events = [...this.state.events];
    this.state.events = [];
    return events;
  }

  /** Check whether tracker is currently active */
  isTracking(): boolean {
    return this.state.isTracking;
  }
}
