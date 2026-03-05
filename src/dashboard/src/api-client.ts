// API client — typed fetch wrappers for /api/jobs CRUD endpoints

import type { Job, JobCreateInput } from "./types.js";

const BASE = "/api";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/** Create a new job — POST /api/jobs */
export async function createJob(input: JobCreateInput): Promise<Job> {
  const res = await fetch(`${BASE}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<Job>(res);
}

/** List all jobs — GET /api/jobs */
export async function listJobs(): Promise<Job[]> {
  const res = await fetch(`${BASE}/jobs`);
  const data = await handleResponse<{ jobs: Job[]; count: number }>(res);
  return data.jobs;
}

/** Get a single job — GET /api/jobs/:id */
export async function getJob(id: string): Promise<Job> {
  const res = await fetch(`${BASE}/jobs/${encodeURIComponent(id)}`);
  return handleResponse<Job>(res);
}

/** Cancel/delete a job — DELETE /api/jobs/:id */
export async function cancelJob(id: string): Promise<void> {
  const res = await fetch(`${BASE}/jobs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
}

/** Returns the URL for streaming the output video */
export function getOutputUrl(id: string): string {
  return `${BASE}/jobs/${encodeURIComponent(id)}/output`;
}
