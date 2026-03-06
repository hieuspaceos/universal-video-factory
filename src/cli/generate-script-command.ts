// CLI subcommand: video-factory generate-script
// Generates a step-by-step tutorial script from URL + purpose for human-assisted recording.

import type { Argv } from "yargs";
import { generateTutorialScript, saveTutorialScript } from "../script/tutorial-script-generator.js";

export function registerGenerateScriptCommand(yargs: Argv): Argv {
  return yargs.command(
    "generate-script",
    "Generate a tutorial script from URL + purpose",
    (y) =>
      y
        .option("url", {
          type: "string",
          description: "Target URL for the tutorial",
          demandOption: true,
        })
        .option("purpose", {
          type: "string",
          description: 'What the tutorial demonstrates (e.g. "How to login and checkout")',
          demandOption: true,
        })
        .option("lang", {
          type: "string",
          description: "Script language (en, vi, etc.)",
          default: "en",
        })
        .option("content", {
          type: "string",
          description: "Additional context text (from tree-id or manual input)",
        })
        .option("output", {
          type: "string",
          description: "Output path for script.json",
          default: "script.json",
        }),
    async (argv) => {
      const script = await generateTutorialScript({
        url: argv.url as string,
        purpose: argv.purpose as string,
        lang: argv.lang as string,
        content: argv.content as string | undefined,
      });

      saveTutorialScript(script, argv.output as string);

      console.log(`\nScript: "${script.title}"`);
      for (const step of script.steps) {
        console.log(`  ${step.step}. [${step.expectedDurationSec}s] ${step.instruction}`);
      }
      console.log(`\nTotal: ~${script.totalExpectedDurationSec}s, ${script.steps.length} steps`);
    }
  );
}
