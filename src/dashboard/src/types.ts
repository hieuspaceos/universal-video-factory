// Frontend types — mirrors src/queue/types.ts for the dashboard SPA

export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface JobProgress {
  phase: string;
  phaseName: string;
  percent: number;
}

export interface JobConfig {
  url: string;
  feature: string;
  lang: string;
  brand?: string;
  voice?: string;
  output: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  config: JobConfig;
  progress: JobProgress | null;
  outputPath: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
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

// WebSocket event types emitted by the server
export type WsEventType =
  | "job:created"
  | "job:progress"
  | "job:completed"
  | "job:failed"
  | "job:cancelled"
  | "job:log";

/** Job-level events that carry the full updated job object */
export interface WsJobEvent {
  type: "job:created" | "job:progress" | "job:completed" | "job:failed" | "job:cancelled";
  job: Job;
}

/** Log line streamed from a running job */
export interface WsLogEvent {
  type: "job:log";
  jobId: string;
  line: string;
}

export type WsEvent = WsJobEvent | WsLogEvent;

// Pipeline phase definitions — A through E
export const PIPELINE_PHASES = [
  { id: "A", label: "Capture" },
  { id: "B", label: "Script" },
  { id: "C", label: "Scenes" },
  { id: "D", label: "Render" },
  { id: "E", label: "Export" },
] as const;

export type PhaseId = (typeof PIPELINE_PHASES)[number]["id"];
