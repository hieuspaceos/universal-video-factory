// Worker thread entry — runs PipelineCoordinator in isolation
// Receives job config via workerData, posts progress/result to parent

import { parentPort, workerData } from "worker_threads";
import { PipelineCoordinator } from "../orchestrator/pipeline-coordinator.js";
import type { PipelineConfig } from "../orchestrator/types.js";
import type { WorkerMessage } from "./types.js";

if (!parentPort) throw new Error("job-worker must run inside a worker thread");

const config = workerData.config as PipelineConfig;
const preview = (workerData.preview as boolean) ?? false;

// Minimal progress interface compatible with PipelineCoordinator
const progress = {
  startPhase(phase: string, name: string) {
    const msg: WorkerMessage = { type: "progress", phase, phaseName: name };
    parentPort!.postMessage(msg);
  },
  completePhase(_phase: string) {},
  updateProgress(_id: string, _current: number, _total?: number) {},
  summary(_path: string) {},
} as import("../cli/progress-display.js").ProgressDisplay;

async function run() {
  try {
    const coordinator = new PipelineCoordinator(config, { preview, progress });
    const result = await coordinator.run();

    if (result.success) {
      const msg: WorkerMessage = {
        type: "complete",
        outputPath: result.export?.finalPath ?? config.output,
        elapsedMs: result.elapsedMs,
      };
      parentPort!.postMessage(msg);
    } else {
      const msg: WorkerMessage = { type: "error", message: result.error ?? "Unknown pipeline error" };
      parentPort!.postMessage(msg);
    }
  } catch (err) {
    const msg: WorkerMessage = { type: "error", message: (err as Error).message };
    parentPort!.postMessage(msg);
  }
}

run();
