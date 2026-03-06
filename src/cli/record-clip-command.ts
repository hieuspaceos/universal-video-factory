// CLI subcommand: video-factory record-clip
// Records a single atomic browser action as a reusable clip in the clip library.

import type { Argv } from "yargs";
import { recordClip } from "../clips/clip-recorder.js";
import { CatalogManager } from "../clips/catalog-manager.js";

export function registerRecordClipCommand(yargs: Argv): Argv {
  return yargs.command(
    "record-clip",
    "Record a single browser action as a reusable clip",
    (y) =>
      y
        .option("url", {
          type: "string",
          description: "URL to navigate to before recording",
          demandOption: true,
        })
        .option("action", {
          type: "string",
          description: 'Action to perform (e.g. "Click the first checkbox")',
          demandOption: true,
        })
        .option("type", {
          type: "string",
          description: "Action type tag (checkbox, dropdown, input, button, drag-drop, custom)",
          demandOption: true,
        })
        .option("tags", {
          type: "string",
          description: "Comma-separated tags for searchability",
          default: "",
        })
        .option("headed", {
          type: "boolean",
          description: "Run browser in headed mode for debugging",
          default: false,
        })
        .option("catalog-dir", {
          type: "string",
          description: "Clip catalog directory",
          default: "data/clips",
        }),
    async (argv) => {
      await runRecordClip(argv as RecordClipArgs);
    }
  );
}

interface RecordClipArgs {
  url: string;
  action: string;
  type: string;
  tags: string;
  headed: boolean;
  catalogDir: string;
}

async function runRecordClip(args: RecordClipArgs): Promise<void> {
  const catalog = new CatalogManager(args.catalogDir);
  const clipId = catalog.generateClipId(args.type, args.url);
  const clipDir = catalog.getClipDir(clipId);

  console.log(`[record-clip] Recording clip: ${clipId}`);
  console.log(`  URL:    ${args.url}`);
  console.log(`  Action: ${args.action}`);
  console.log(`  Type:   ${args.type}`);

  const result = await recordClip(
    {
      url: args.url,
      action: args.action,
      headless: !args.headed,
    },
    clipDir
  );

  // Parse tags from comma-separated string
  const tags = args.tags
    ? args.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  tags.push(args.type);

  // Add unique site tag from URL hostname
  try {
    const hostname = new URL(args.url).hostname.replace("www.", "");
    if (!tags.includes(hostname)) tags.push(hostname);
  } catch { /* ignore invalid URL */ }

  catalog.addClip({
    id: clipId,
    actionType: args.type,
    description: args.action,
    url: args.url,
    videoPath: result.videoPath,
    thumbnailPath: result.thumbnailPath,
    durationMs: result.durationMs,
    viewportWidth: 1920,
    viewportHeight: 1080,
    fps: 30,
    clickX: result.clickX,
    clickY: result.clickY,
    tags,
    recordedAt: new Date().toISOString(),
  });

  console.log(`\n[record-clip] Clip saved: ${clipId}`);
  console.log(`  Video:    ${result.videoPath}`);
  console.log(`  Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
  console.log(`  Tags:     ${tags.join(", ")}`);
}
