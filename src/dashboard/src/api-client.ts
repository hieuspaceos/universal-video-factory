// API client — typed fetch wrappers for /api/jobs CRUD endpoints

import type { Job, JobCreateInput } from "./types.js";

const BASE = "/api";

/** Map HTTP status codes to user-friendly messages */
function friendlyError(status: number, raw: string): string {
  if (status === 0 || raw === "Failed to fetch") return "Cannot reach server — is it running?";
  if (status === 404) return "Job not found.";
  if (status === 409) return "Conflict — job is already in this state.";
  if (status === 422 || status === 400) {
    try {
      const parsed = JSON.parse(raw) as { error?: unknown };
      if (parsed.error) return `Validation error: ${JSON.stringify(parsed.error)}`;
    } catch { /* fall through */ }
    return `Bad request: ${raw}`;
  }
  if (status >= 500) return `Server error (${status}) — check server logs.`;
  return `Request failed (${status}): ${raw}`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const raw = await res.text().catch(() => res.statusText);
    throw new Error(friendlyError(res.status, raw));
  }
  return res.json() as Promise<T>;
}

/** Wraps fetch to give a friendly message on network failure */
async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error("Cannot reach server — is it running?");
  }
}

/** Create a new job — POST /api/jobs */
export async function createJob(input: JobCreateInput): Promise<Job> {
  const res = await apiFetch(`${BASE}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<Job>(res);
}

/** List all jobs — GET /api/jobs */
export async function listJobs(): Promise<Job[]> {
  const res = await apiFetch(`${BASE}/jobs`);
  const data = await handleResponse<{ jobs: Job[]; count: number }>(res);
  return data.jobs;
}

/** Get a single job — GET /api/jobs/:id */
export async function getJob(id: string): Promise<Job> {
  const res = await apiFetch(`${BASE}/jobs/${encodeURIComponent(id)}`);
  return handleResponse<Job>(res);
}

/** Cancel/delete a job — DELETE /api/jobs/:id */
export async function cancelJob(id: string): Promise<void> {
  const res = await apiFetch(`${BASE}/jobs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => res.statusText);
    throw new Error(friendlyError(res.status, raw));
  }
}

/** Fetch accumulated log lines for a job — GET /api/jobs/:id/logs */
export async function getJobLogs(id: string): Promise<string[]> {
  const res = await apiFetch(`${BASE}/jobs/${encodeURIComponent(id)}/logs`);
  const data = await handleResponse<{ lines: string[] }>(res);
  return data.lines;
}

/** Returns the URL for streaming the output video */
export function getOutputUrl(id: string): string {
  return `${BASE}/jobs/${encodeURIComponent(id)}/output`;
}
