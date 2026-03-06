// CLI subcommand: video-factory clips
// List, search, inspect, and remove clips from the catalog.

import type { Argv } from "yargs";
import { CatalogManager } from "../clips/catalog-manager.js";

export function registerClipsCommand(yargs: Argv): Argv {
  return yargs.command(
    "clips",
    "Manage the clip library (list, info, remove)",
    (y) =>
      y
        .command(
          "list",
          "List all clips in the catalog",
          (sub) =>
            sub
              .option("type", { type: "string", description: "Filter by action type" })
              .option("tag", { type: "string", description: "Filter by tag" })
              .option("catalog-dir", { type: "string", default: "data/clips" }),
          (argv) => listClips(argv as ListArgs)
        )
        .command(
          "info <clip-id>",
          "Show detailed info for a clip",
          (sub) =>
            sub
              .positional("clip-id", { type: "string", demandOption: true })
              .option("catalog-dir", { type: "string", default: "data/clips" }),
          (argv) => clipInfo(argv as InfoArgs)
        )
        .command(
          "remove <clip-id>",
          "Remove a clip from the catalog and delete its files",
          (sub) =>
            sub
              .positional("clip-id", { type: "string", demandOption: true })
              .option("catalog-dir", { type: "string", default: "data/clips" }),
          (argv) => removeClip(argv as RemoveArgs)
        )
        .demandCommand(1, "Specify a clips subcommand: list, info, or remove"),
    () => { /* handled by subcommands */ }
  );
}

interface ListArgs { type?: string; tag?: string; catalogDir: string }
interface InfoArgs { clipId: string; catalogDir: string }
interface RemoveArgs { clipId: string; catalogDir: string }

function listClips(args: ListArgs): void {
  const catalog = new CatalogManager(args.catalogDir);
  const tags = args.tag ? [args.tag] : undefined;
  const clips = catalog.listClips({ actionType: args.type, tags });

  if (clips.length === 0) {
    console.log("No clips found.");
    return;
  }

  // Table header
  console.log(
    padRight("ID", 45) +
    padRight("Type", 12) +
    padRight("Duration", 10) +
    padRight("Tags", 30) +
    "Description"
  );
  console.log("-".repeat(120));

  for (const clip of clips) {
    console.log(
      padRight(clip.id, 45) +
      padRight(clip.actionType, 12) +
      padRight(`${(clip.durationMs / 1000).toFixed(1)}s`, 10) +
      padRight(clip.tags.join(", "), 30) +
      clip.description.slice(0, 40)
    );
  }
  console.log(`\n${clips.length} clip(s) total`);
}

function clipInfo(args: InfoArgs): void {
  const catalog = new CatalogManager(args.catalogDir);
  const clip = catalog.getClip(args.clipId);
  if (!clip) {
    console.error(`Clip not found: ${args.clipId}`);
    process.exit(1);
  }
  console.log(JSON.stringify(clip, null, 2));
}

function removeClip(args: RemoveArgs): void {
  const catalog = new CatalogManager(args.catalogDir);
  const removed = catalog.removeClip(args.clipId);
  if (removed) {
    console.log(`Removed clip: ${args.clipId}`);
  } else {
    console.error(`Clip not found: ${args.clipId}`);
    process.exit(1);
  }
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}
