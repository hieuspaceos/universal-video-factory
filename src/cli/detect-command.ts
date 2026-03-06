// CLI command: video-factory detect --events <path> [--output <path>]
// Runs cursor-based detection on events.json → outputs markers.json

import type { Argv } from "yargs";
import * as path from "path";
import { detectFromFile } from "../detection/cursor-detector.js";

export function registerDetectCommand(yargs: Argv): void {
  yargs.command(
    "detect",
    "Detect zoom/highlight markers from recording events",
    (y) =>
      y
        .option("events", {
          type: "string",
          description: "Path to events.json from recording",
          demandOption: true,
        })
        .option("output", {
          type: "string",
          description: "Output path for markers.json (default: same dir as events)",
        }),
    async (argv) => {
      const eventsPath = path.resolve(argv.events as string);
      const outputPath = argv.output
        ? path.resolve(argv.output as string)
        : path.join(path.dirname(eventsPath), "markers.json");

      console.log(`[detect] Reading events from: ${eventsPath}`);
      const result = await detectFromFile(eventsPath, outputPath);

      const zoomCount = result.markers.filter((m) => m.type === "zoom").length;
      const highlightCount = result.markers.filter((m) => m.type === "highlight").length;
      const clickCount = result.markers.filter((m) => m.type === "click").length;

      console.log(`[detect] Generated ${result.markers.length} markers:`);
      console.log(`  Zoom: ${zoomCount} | Highlight: ${highlightCount} | Click: ${clickCount}`);
      console.log(`  Scenes: ${result.scenes.length}`);
      console.log(`[detect] Saved to: ${outputPath}`);
    }
  );
}
