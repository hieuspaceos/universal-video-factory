// CLI entry point — unified yargs command registration, env loading, pipeline invocation

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// Load .env.local if present (takes precedence over .env)
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const { configDotenv } = await import("dotenv");
  configDotenv({ path: envLocalPath, override: true });
}

// Startup dependency check
function checkDependency(cmd: string): boolean {
  try {
    child_process.execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Validate required API keys for pipeline execution
function checkApiKeys(): void {
  const missing: string[] = [];
  if (!process.env["ANTHROPIC_API_KEY"]) missing.push("ANTHROPIC_API_KEY (required for AI Director)");
  if (!process.env["ELEVENLABS_API_KEY"]) missing.push("ELEVENLABS_API_KEY (required for voice synthesis)");
  if (missing.length > 0) {
    console.error("[video-factory] Missing required environment variables:");
    for (const key of missing) console.error(`  - ${key}`);
    process.exit(1);
  }
}

// Register SIGINT/SIGTERM handlers for graceful pipeline interruption
function registerPipelineSignalHandlers(): void {
  const handler = () => {
    console.error("\n[video-factory] Pipeline interrupted.");
    console.error("[video-factory] Tip: re-run with --resume to continue from last checkpoint.");
    process.exit(130);
  };
  process.on("SIGINT", handler);
  process.on("SIGTERM", handler);
}

const rawArgs = hideBin(process.argv);

const cli = yargs(rawArgs)
  .scriptName("video-factory")
  .usage("$0 <command> [options]")
  .command(
    "tutorial",
    "Create a tutorial video (script -> record -> detect -> render)",
    async () => {
      const { registerTutorialCommand } = await import("./tutorial-command.js");
      const y = yargs(rawArgs);
      registerTutorialCommand(y);
      await y.help().parseAsync();
    }
  )
  .command(
    "generate-script",
    "Generate a tutorial script from URL + purpose",
    async () => {
      const { registerGenerateScriptCommand } = await import("./generate-script-command.js");
      const y = yargs(rawArgs);
      registerGenerateScriptCommand(y);
      await y.help().parseAsync();
    }
  )
  .command(
    "record",
    "Record screen with script overlay (human-controlled)",
    async () => {
      const { registerRecordCommand } = await import("./record-command.js");
      const y = yargs(rawArgs);
      registerRecordCommand(y);
      await y.help().parseAsync();
    }
  )
  .command(
    "detect",
    "Detect zoom/highlight markers from recording events",
    async () => {
      const { registerDetectCommand } = await import("./detect-command.js");
      const y = yargs(rawArgs);
      registerDetectCommand(y);
      await y.help().parseAsync();
    }
  )
  .command(
    "compose",
    "Compose video from pre-recorded clips + narration manifest",
    async () => {
      const { registerComposeCommand } = await import("./compose-command.js");
      const y = yargs(rawArgs);
      registerComposeCommand(y);
      await y.help().parseAsync();
    }
  )
  .command(
    "record-clip",
    "Record a single browser action as a reusable clip",
    async () => {
      const { registerRecordClipCommand } = await import("./record-clip-command.js");
      const y = yargs(rawArgs);
      registerRecordClipCommand(y);
      await y.help().parseAsync();
    }
  )
  .command(
    "clips",
    "Manage the clip library (list, info, remove)",
    async () => {
      const { registerClipsCommand } = await import("./clips-list-command.js");
      const y = yargs(rawArgs);
      registerClipsCommand(y);
      await y.help().parseAsync();
    }
  )
  .command(
    "serve",
    "Start web dashboard server",
    (y) =>
      y.option("port", {
        type: "number",
        description: "Server port",
        default: 3456,
      }),
    async (argv) => {
      const { runServe } = await import("../server/serve-command.js");
      runServe(argv.port);
    }
  )
  .command(
    "run",
    "Run legacy auto-pipeline (URL + feature -> AI analysis -> capture -> render)",
    (y) =>
      y
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
          description: "Narration language code",
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
          description: "Output directory path",
          default: "./output",
        })
        .option("resume", {
          type: "boolean",
          description: "Resume pipeline from last checkpoint",
          default: false,
        })
        .option("preview", {
          type: "boolean",
          description: "Render at 720p for faster preview iteration",
          default: false,
        })
        .option("verbose", {
          type: "boolean",
          description: "Enable debug-level log output",
          default: false,
        }),
    async (argv) => {
      const { parseArguments, ArgumentValidationError } = await import("./parse-arguments.js");
      const { PipelineCoordinator } = await import("../orchestrator/pipeline-coordinator.js");
      const { configureLogger } = await import("../utils/logger.js");
      const { ProgressDisplay } = await import("./progress-display.js");

      // Check system dependencies
      const missingDeps: string[] = [];
      if (!checkDependency("ffmpeg")) missingDeps.push("ffmpeg (brew install ffmpeg)");
      if (!checkDependency("node")) missingDeps.push("node 20+ (brew install node)");
      if (missingDeps.length > 0) {
        console.error("[video-factory] Missing required dependencies:");
        for (const dep of missingDeps) console.error(`  - ${dep}`);
        process.exit(1);
      }

      checkApiKeys();
      registerPipelineSignalHandlers();

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

      const outputDir = path.resolve(config.output);
      fs.mkdirSync(outputDir, { recursive: true });
      configureLogger(outputDir, argv.verbose);

      console.log(`[video-factory] Starting pipeline`);
      console.log(`  URL:     ${config.url}`);
      console.log(`  Feature: ${config.feature}`);
      console.log(`  Lang:    ${config.lang}`);
      console.log(`  Output:  ${config.output}`);
      if (config.cookies) console.log(`  Cookies: ${config.cookies}`);
      if (config.manual) console.log(`  Mode:    MANUAL`);
      if (argv.resume) console.log(`  Resume:  enabled`);
      if (argv.preview) console.log(`  Preview: 720p`);

      const progress = new ProgressDisplay();
      const coordinator = new PipelineCoordinator(config, {
        resume: argv.resume,
        preview: argv.preview,
        progress,
      });
      const result = await coordinator.run();

      if (result.success) {
        const finalPath = result.export?.finalPath ?? config.output;
        progress.summary(finalPath);
        process.exit(0);
      } else {
        console.error(`\n[video-factory] Pipeline failed: ${result.error}`);
        console.error(`[video-factory] See pipeline.log in output dir for details.`);
        process.exit(1);
      }
    }
  )
  .demandCommand(1, "Specify a command. Run --help to see available commands.")
  .help()
  .alias("h", "help")
  .version()
  .alias("v", "version")
  .strict();

await cli.parseAsync();
