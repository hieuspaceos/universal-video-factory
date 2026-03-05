// CLI "serve" subcommand — starts the web dashboard server

import { createServer } from "./index.js";

export function runServe(port: number): ReturnType<typeof createServer> {
  return createServer(port);
}
