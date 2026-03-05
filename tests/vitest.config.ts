// Vitest configuration for video-factory unit and integration tests

import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

export default defineConfig({
  root: projectRoot,
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    globals: false,
    reporters: ["verbose"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/cli/index.ts", "src/**/*.d.ts"],
    },
  },
  resolve: {
    // Support .js extensions in imports (NodeNext module resolution)
    extensions: [".ts", ".js"],
  },
});
