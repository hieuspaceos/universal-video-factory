import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config — proxies /api and /ws to the Hono API server on port 3456
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3456",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:3456",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
