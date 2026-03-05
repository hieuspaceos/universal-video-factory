// Hono API server — routes, WebSocket, static files

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { initStore, closeStore } from "../queue/job-store.js";
import { startRunner, stopRunner } from "../queue/job-runner.js";
import { jobRoutes } from "./routes-jobs.js";
import { addClient, broadcast } from "./websocket-hub.js";

export function createServer(port = 3456) {
  const app = new Hono();

  // CORS for Vite dev server
  app.use("/api/*", cors({ origin: "http://localhost:5173" }));

  // Initialize SQLite store
  initStore();

  // REST API routes
  app.route("/api/jobs", jobRoutes);

  // Health check
  app.get("/api/health", (c) => c.json({ status: "ok" }));

  // Start queue runner with WebSocket broadcast callbacks
  startRunner(
    (jobId, progress) => {
      broadcast({ type: "job:progress", jobId, progress });
    },
    (jobId, status, detail) => {
      broadcast({ type: `job:${status}`, jobId, detail });
    }
  );

  // Start HTTP server
  const server = serve({ fetch: app.fetch, port, hostname: "127.0.0.1" }, (info) => {
    console.log(`[server] Dashboard running at http://localhost:${info.port}`);
  });

  // Attach WebSocket server to the same HTTP server
  const wss = new WebSocketServer({ server: server as unknown as import("http").Server, path: "/ws" });
  wss.on("connection", (ws) => {
    addClient(ws);
    console.log("[ws] Client connected");
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("\n[server] Shutting down...");
    stopRunner();
    wss.close();
    closeStore();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return { app, server, wss };
}
