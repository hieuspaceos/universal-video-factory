// CLI subcommand: video-factory compose
// Assembles pre-recorded clips + narration into a video without re-recording.

import * as fs from "fs";
import type { Argv } from "yargs";
import { composeManifestSchema } from "../clips/types.js";
import { runComposePipeline } from "../clips/compose-pipeline.js";

export function registerComposeCommand(yargs: Argv): Argv {
  return yargs.command(
    "compose",
    "Compose a video from pre-recorded clips + narration manifest",
    (y) =>
      y
        .option("manifest", {
          type: "string",
          description: "Path to compose manifest JSON",
          demandOption: true,
        })
        .option("output", {
          type: "string",
          description: "Output directory",
          default: "./output",
        })
        .option("preview", {
          type: "boolean",
          description: "Render at 720p for faster preview",
          default: false,
        })
        .option("brand", {
          type: "string",
          description: "Path to brand.json",
        })
        .option("catalog-dir", {
          type: "string",
          description: "Clip catalog directory",
          default: "data/clips",
        }),
    async (argv) => {
      await runCompose(argv as ComposeArgs);
    }
  );
}

interface ComposeArgs {
  manifest: string;
  output: string;
  preview: boolean;
  brand?: string;
  catalogDir: string;
}

async function runCompose(args: ComposeArgs): Promise<void> {
  // Validate ElevenLabs key (needed for voice TTS)
  if (!process.env["ELEVENLABS_API_KEY"]) {
    console.error("[compose] ELEVENLABS_API_KEY is required for voice synthesis.");
    process.exit(1);
  }

  // Load and validate manifest
  if (!fs.existsSync(args.manifest)) {
    console.error(`[compose] Manifest file not found: ${args.manifest}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(args.manifest, "utf-8");
  let manifestData: unknown;
  try {
    manifestData = JSON.parse(raw);
  } catch {
    console.error(`[compose] Invalid JSON in manifest: ${args.manifest}`);
    process.exit(1);
  }

  const parsed = composeManifestSchema.safeParse(manifestData);
  if (!parsed.success) {
    console.error(`[compose] Invalid manifest format:`);
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const manifest = parsed.data;
  if (args.brand) manifest.brand = args.brand;

  console.log(`[compose] Composing video from ${manifest.clips.length} clip(s)`);
  console.log(`  Output: ${args.output}`);

  fs.mkdirSync(args.output, { recursive: true });

  const result = await runComposePipeline({
    manifest,
    outputDir: args.output,
    preview: args.preview,
    catalogDir: args.catalogDir,
  });

  if (result.success) {
    console.log(`\n[compose] Video ready: ${result.export?.finalPath}`);
    process.exit(0);
  } else {
    console.error(`\n[compose] Failed: ${result.error}`);
    process.exit(1);
  }
}
