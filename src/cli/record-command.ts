// CLI subcommand: video-factory record
// Opens browser with script overlay for human-controlled screen recording.

import * as fs from "fs";
import type { Argv } from "yargs";
import { recordHumanSession } from "../recorder/human-screen-recorder.js";
import { TutorialScriptSchema } from "../script/script-types.js";

export function registerRecordCommand(yargs: Argv): Argv {
  return yargs.command(
    "record",
    "Record screen with script overlay (human-controlled)",
    (y) =>
      y
        .option("script", {
          type: "string",
          description: "Path to script.json from generate-script",
          demandOption: true,
        })
        .option("url", {
          type: "string",
          description: "Override URL (default: from script step 1)",
        })
        .option("output", {
          type: "string",
          description: "Output directory for recording",
          default: "output/recording",
        }),
    async (argv) => {
      const scriptRaw = JSON.parse(fs.readFileSync(argv.script as string, "utf-8"));
      const script = TutorialScriptSchema.parse(scriptRaw);

      // Use provided URL or extract from first step instruction
      const url = (argv.url as string) ?? extractUrlFromScript(script.steps[0]?.instruction ?? "");
      if (!url) {
        console.error("[record] No URL provided and could not extract from script. Use --url.");
        process.exit(1);
      }

      const result = await recordHumanSession({
        script,
        url,
        outputDir: argv.output as string,
      });

      console.log(`\nRecording complete:`);
      console.log(`  Video:  ${result.videoPath}`);
      console.log(`  Events: ${result.eventsPath}`);
      console.log(`  Scenes: ${result.sceneCount}`);
      console.log(`  Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
    }
  );
}

/** Try to extract URL from instruction text like "Navigate to https://..." */
function extractUrlFromScript(instruction: string): string | undefined {
  const match = instruction.match(/https?:\/\/[^\s'"]+/);
  return match?.[0];
}
