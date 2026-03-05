// CLI entry point — yargs setup, env loading, pipeline invocation

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { parseArguments, ArgumentValidationError } from "./parse-arguments.js";
import { PipelineCoordinator } from "../orchestrator/pipeline-coordinator.js";

// Load .env.local if present (takes precedence over .env)
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const { configDotenv } = await import("dotenv");
  configDotenv({ path: envLocalPath, override: true });
}

const argv = await yargs(hideBin(process.argv))
  .scriptName("video-factory")
  .usage("$0 --url <url> --feature <feature> [options]")
  .option("url", {
    type: "string",
    description: "Target URL to record (must be http/https)",
    demandOption: true,
  })
  .option("feature", {
    type: "string",
    description: 'Feature to demonstrate (e.g. "sign up", "checkout flow")',
    demandOption: true,
  })
  .option("lang", {
    type: "string",
    description: "Narration language code (default: en)",
    default: "en",
  })
  .option("brand", {
    type: "string",
    description: "Path to brand assets directory (logo, colors, fonts)",
  })
  .option("voice", {
    type: "string",
    description: "Path to voice config JSON (ElevenLabs voice ID + settings)",
  })
  .option("cookies", {
    type: "string",
    description: "Path to cookies JSON file for session injection",
  })
  .option("manual", {
    type: "boolean",
    description: "Pause before screenshot for manual navigation",
    default: false,
  })
  .option("output", {
    type: "string",
    description: "Output directory path (default: ./output)",
    default: "./output",
  })
  .example(
    '$0 --url=https://example.com --feature="sign up"',
    "Record sign-up flow tutorial"
  )
  .example(
    '$0 --url=https://app.example.com --feature="checkout" --cookies=./session.json --output=./my-video',
    "Record authenticated checkout with cookies"
  )
  .help()
  .alias("h", "help")
  .version()
  .alias("v", "version")
  .strict()
  .parseAsync();

// Validate arguments
let config;
try {
  config = parseArguments({
    url: argv.url,
    feature: argv.feature,
    lang: argv.lang,
    brand: argv.brand,
    voice: argv.voice,
    cookies: argv.cookies,
    manual: argv.manual,
    output: argv.output,
  });
} catch (err) {
  if (err instanceof ArgumentValidationError) {
    console.error(`[video-factory] Error: ${err.message}`);
    process.exit(1);
  }
  throw err;
}

console.log(`[video-factory] Starting pipeline`);
console.log(`  URL:     ${config.url}`);
console.log(`  Feature: ${config.feature}`);
console.log(`  Lang:    ${config.lang}`);
console.log(`  Output:  ${config.output}`);
if (config.cookies) console.log(`  Cookies: ${config.cookies}`);
if (config.manual)  console.log(`  Mode:    MANUAL`);

const coordinator = new PipelineCoordinator(config);
const result = await coordinator.run();

if (result.success) {
  console.log(`\n[video-factory] Done in ${(result.elapsedMs / 1000).toFixed(1)}s`);
  console.log(`  Output: ${config.output}`);
  process.exit(0);
} else {
  console.error(`\n[video-factory] Pipeline failed: ${result.error}`);
  process.exit(1);
}
