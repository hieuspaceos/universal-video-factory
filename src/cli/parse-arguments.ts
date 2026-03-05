// CLI argument validation and defaults — called after yargs parses raw argv

import * as fs from "fs";
import type { PipelineConfig } from "../orchestrator/types.js";

export interface RawArgs {
  url: string;
  feature: string;
  lang?: string;
  brand?: string;
  voice?: string;
  cookies?: string;
  manual?: boolean;
  output?: string;
}

export class ArgumentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArgumentValidationError";
  }
}

/**
 * Validate and normalize raw CLI arguments into a PipelineConfig.
 * Throws ArgumentValidationError on invalid input.
 */
export function parseArguments(args: RawArgs): PipelineConfig {
  // Validate URL — must be http or https
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(args.url);
  } catch {
    throw new ArgumentValidationError(`Invalid URL: "${args.url}". Must be a valid http/https URL.`);
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new ArgumentValidationError(
      `URL scheme "${parsedUrl.protocol}" not allowed. Only http/https are permitted.`
    );
  }

  // Validate feature is non-empty
  const feature = args.feature.trim();
  if (!feature) {
    throw new ArgumentValidationError("--feature must be a non-empty string.");
  }

  // Validate optional file paths exist if provided
  if (args.brand) assertFileExists("--brand", args.brand);
  if (args.voice) assertFileExists("--voice", args.voice);
  if (args.cookies) assertFileExists("--cookies", args.cookies);

  return {
    url: args.url,
    feature,
    lang: args.lang ?? "en",
    brand: args.brand,
    voice: args.voice,
    cookies: args.cookies,
    manual: args.manual ?? false,
    output: args.output ?? "./output",
  };
}

function assertFileExists(flag: string, filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new ArgumentValidationError(`${flag} path does not exist: "${filePath}"`);
  }
}
