// Job runner — polls queue, spawns worker threads, relays progress

import { Worker } from "worker_threads";
import * as path from "path";
import { fileURLToPath } from "url";
import { getNextQueued, updateJob } from "./job-store.js";
import type { WorkerMessage, JobProgress } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = path.join(__dirname, "job-worker.js");
const POLL_INTERVAL_MS = 2000;

type ProgressCallback = (jobId: string, progress: JobProgress) => void;
type CompletionCallback = (jobId: string, status: "completed" | "failed", detail: string) => void;

let activeWorker: Worker | null = null;
let activeJobId: string | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

/** Start the queue runner — polls for queued jobs and runs them */
export function startRunner(
  onProgress: ProgressCallback,
  onCompletion: CompletionCallback
): void {
  if (pollTimer) return; // already running

  pollTimer = setInterval(() => {
    if (activeWorker) return; // one job at a time

    const job = getNextQueued();
    if (!job) return;

    activeJobId = job.id;
    const now = new Date().toISOString();
    updateJob(job.id, { status: "running", startedAt: now });

    console.log(`[runner] Starting job ${job.id}: ${job.config.url} — "${job.config.feature}"`);

    activeWorker = new Worker(WORKER_PATH, {
      workerData: { config: job.config, preview: false },
    });

    // Phase weights for overall percent calculation
    const phasePercent: Record<string, number> = { A: 10, B: 30, C: 15, D: 35, E: 10 };
    let currentPercent = 0;

    activeWorker.on("message", (msg: WorkerMessage) => {
      if (msg.type === "progress") {
        // Calculate cumulative percent based on which phase started
        const phaseWeight = phasePercent[msg.phase] ?? 10;
        currentPercent = Math.min(currentPercent + phaseWeight, 95);
        const progress: JobProgress = {
          phase: msg.phase,
          phaseName: msg.phaseName,
          percent: currentPercent,
        };
        updateJob(job.id, { progress });
        onProgress(job.id, progress);
      }

      if (msg.type === "complete") {
        updateJob(job.id, {
          status: "completed",
          outputPath: msg.outputPath,
          completedAt: new Date().toISOString(),
          progress: { phase: "E", phaseName: "Complete", percent: 100 },
        });
        onCompletion(job.id, "completed", msg.outputPath);
        cleanupWorker();
      }

      if (msg.type === "error") {
        updateJob(job.id, {
          status: "failed",
          error: msg.message,
          completedAt: new Date().toISOString(),
        });
        onCompletion(job.id, "failed", msg.message);
        cleanupWorker();
      }
    });

    activeWorker.on("error", (err) => {
      console.error(`[runner] Worker error for job ${job.id}:`, err.message);
      updateJob(job.id, {
        status: "failed",
        error: err.message,
        completedAt: new Date().toISOString(),
      });
      onCompletion(job.id, "failed", err.message);
      cleanupWorker();
    });

    activeWorker.on("exit", (code) => {
      if (code !== 0 && activeJobId === job.id) {
        console.error(`[runner] Worker exited with code ${code} for job ${job.id}`);
        updateJob(job.id, {
          status: "failed",
          error: `Worker exited with code ${code}`,
          completedAt: new Date().toISOString(),
        });
        onCompletion(job.id, "failed", `Worker exited with code ${code}`);
      }
      cleanupWorker();
    });
  }, POLL_INTERVAL_MS);

  console.log("[runner] Queue runner started");
}

/** Cancel the currently running job */
export function cancelRunningJob(jobId: string): boolean {
  if (activeJobId !== jobId || !activeWorker) return false;
  activeWorker.terminate();
  updateJob(jobId, { status: "cancelled", completedAt: new Date().toISOString() });
  cleanupWorker();
  return true;
}

/** Stop the queue runner */
export function stopRunner(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (activeWorker) {
    activeWorker.terminate();
    cleanupWorker();
  }
  console.log("[runner] Queue runner stopped");
}

/** Get the currently running job ID */
export function getActiveJobId(): string | null {
  return activeJobId;
}

function cleanupWorker(): void {
  activeWorker = null;
  activeJobId = null;
}
