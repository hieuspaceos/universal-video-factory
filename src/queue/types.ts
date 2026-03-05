// Queue types — job state, progress, and input validation

import type { PipelineConfig } from "../orchestrator/types.js";

export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface Job {
  id: string;
  status: JobStatus;
  config: PipelineConfig;
  progress: JobProgress | null;
  outputPath: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface JobProgress {
  phase: string;
  phaseName: string;
  percent: number;
}

export interface JobCreateInput {
  url: string;
  feature: string;
  lang?: string;
  brand?: string;
  voice?: string;
  cookies?: string;
  preview?: boolean;
}

/** Messages sent from worker thread to parent */
export type WorkerMessage =
  | { type: "progress"; phase: string; phaseName: string }
  | { type: "complete"; outputPath: string; elapsedMs: number }
  | { type: "error"; message: string };
